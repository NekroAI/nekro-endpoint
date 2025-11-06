# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**NekroEndpoint** 是一个基于 Cloudflare Workers 构建的**端点编排平台**，允许用户在全球边缘节点上创建和管理 API 端点。

### 核心功能

- **三种端点类型**：
  - **静态端点**（Static）：托管文本内容、配置文件
  - **代理端点**（Proxy）：转发请求到目标 URL（如加速 GitHub raw 内容）
  - **脚本端点**（Script）：运行自定义 JavaScript 脚本（Phase 3）

- **双层密钥机制**：
  - **Platform API Key**：用户管理平台功能的凭证（创建/编辑端点、管理权限组）
  - **Endpoint Access Key**：访问已发布端点的凭证（通过权限组管理，可对外分发）

- **权限组系统**：创建权限组 → 生成访问密钥 → 端点关联权限组 → 细粒度访问控制

- **树形端点管理**：层级化组织端点，支持拖拽排序，每个节点都是完整的端点

- **用户激活制**：管理员手动激活后才能发布端点（未激活用户可创建和编辑，但不能发布）

- **管理员审查**：查看所有用户的端点树和内容，强制下线任何端点

### 技术栈

- **后端**：Hono (OpenAPI)、Cloudflare Workers、Cloudflare D1 (SQLite)
- **前端**：React 18、Material-UI、Monaco Editor、React Router、Vite
- **数据库 ORM**：Drizzle ORM
- **类型安全**：Zod（验证）、TypeScript
- **认证**：GitHub OAuth + 会话管理
- **部署**：Cloudflare Pages & Workers

## 常用开发命令

### 开发环境

```bash
# 启动全栈开发服务器（后端 :8787 + 前端 :5173）
pnpm dev

# 仅启动后端（Wrangler）
pnpm dev:backend

# 仅启动前端（Vite）
pnpm dev:frontend

# 类型检查（前后端）
pnpm typecheck
```

### 数据库操作

```bash
# 修改 schema 后生成迁移文件
pnpm db:generate

# 应用迁移（本地开发）
pnpm db:migrate

# 应用迁移（生产环境）
pnpm db:migrate:prod

# 打开 Drizzle Studio（数据库可视化工具）
pnpm db:studio

# 检查 schema 一致性
pnpm db:check

# 数据库填充（seed）
pnpm db:seed         # 本地
pnpm db:seed:prod    # 生产
```

### 构建与部署

```bash
# 构建前端（客户端 + 服务端 SSR 包）
pnpm build

# 生产构建（包含数据库迁移）
pnpm build:prod

# 部署到 Cloudflare
pnpm deploy

# 本地测试生产构建
pnpm serve:prod
```

### 测试

```bash
# 运行测试
pnpm test

# 运行特定测试文件
pnpm test <test-file-name>
```

## 核心架构原理

### 1. 混合渲染模式（开发 vs 生产）

**这是本项目最关键的架构设计，必须深刻理解。**

#### 开发模式 (`pnpm dev`)

- Hono 后端运行在 `localhost:8787`（通过 Wrangler）
- Vite 前端运行在 `localhost:5173`
- **关键机制**：所有非 API 请求到 `:8787` 都会被**代理**到 `:5173`，实现 HMR（热模块替换）
- **禁止假设**：`frontend/dist` 目录在开发环境下**不存在**

```typescript
// src/index.ts:84-97
if (c.env.NODE_ENV === "development") {
  // 代理所有前端请求到 Vite 开发服务器
  const url = new URL(c.req.url);
  url.hostname = "localhost";
  url.port = "5173";
  return fetch(url.toString());
}
```

#### 生产模式 (`pnpm deploy`)

- Vite 将前端构建到：
  - `frontend/dist/client`（静态资源）
  - `dist/server`（SSR 渲染包）
- Hono 通过 `ASSETS` binding 服务静态文件
- **动态导入**：使用 `import()` 加载构建产物，避免开发环境找不到文件导致构建失败

```typescript
// src/index.ts:116-127
const manifestModule = await import("../dist/client/.vite/manifest.json");
const { render } = await import("../dist/server/entry-server.mjs");
```

**为什么使用动态 import？** 因为这些文件只在生产构建后才存在。如果使用静态 `import`，开发环境下会立即报错导致无法启动。

### 2. 端到端类型安全（单一数据源）

**所有类型定义只在 `common/` 目录下维护一次，前后端共享。**

#### 目录结构

```
common/
├── types/index.ts              # TypeScript 类型（从 Zod 推导）
├── validators/                 # Zod Schema（验证 + 类型生成）
│   ├── endpoint.schema.ts      # 端点 Schema
│   ├── permission.schema.ts    # 权限组 Schema
│   ├── auth.schema.ts          # 认证 Schema
│   └── admin.schema.ts         # 管理员 Schema
└── config/api.ts               # 共享 API 配置
```

#### 工作流

1. **定义 Schema**（`common/validators/`）：

```typescript
export const EndpointSchema = z.object({
  id: z.string(),
  path: z.string(),
  type: z.enum(["static", "proxy", "script"]),
  // ...
});
```

2. **推导类型**（`common/types/index.ts`）：

```typescript
export type Endpoint = z.infer<typeof EndpointSchema>;
```

3. **后端使用**（`src/routes/`）：

```typescript
import { EndpointSchema } from "../../common/validators/endpoint.schema";

const route = createRoute({
  responses: {
    200: {
      content: { "application/json": { schema: EndpointSchema } },
    },
  },
});
```

4. **前端使用**（`frontend/src/hooks/`）：

```typescript
import type { Endpoint } from "../../../common/types";

export function useEndpoints() {
  return useQuery({
    queryFn: async () => {
      const res = await fetch(`${getApiBase()}/endpoints`);
      return res.json() as Promise<ApiResponse<{ tree: Endpoint[] }>>;
    },
  });
}
```

### 3. 统一路由系统

**唯一路由定义文件**：`frontend/src/routes.tsx`

客户端入口（`entry-client.tsx`）和服务端入口（`entry-server.tsx`）都使用这个文件，避免重复定义。

#### 添加新页面的步骤

1. 创建页面组件：`frontend/src/pages/NewPage.tsx`
2. 在 `frontend/src/routes.tsx` 中导入并添加路由：

```typescript
import NewPage from './pages/NewPage';

<Route path="new-page" element={<NewPage />} />
```

3. **完成** —— 无需修改任何入口文件

### 4. 数据库 Schema 与迁移

**单一数据源**：`src/db/schema.ts`

#### 核心数据表

根据设计文档（`design.md`），项目包含以下数据表：

- **users**：用户表（GitHub ID、用户名、邮箱、角色、激活状态、Platform API Key）
- **userSessions**：会话表（token、过期时间）
- **endpoints**：端点表（支持树形结构，`parent_id` 字段）
  - `path`：相对路径（如 `/clash-config`）
  - `type`：`static` | `proxy` | `script`
  - `config`：JSON 配置（根据类型不同结构不同）
  - `access_control`：`public` | `authenticated`
  - `required_permission_groups`：JSON array of group IDs
  - `is_published`：是否已发布
  - `sort_order`：排序字段（支持手动拖拽排序）
- **permissionGroups**：权限组表
- **accessKeys**：访问密钥表（格式：`ep-<32位随机字符串>`）
- **envVars**：环境变量表（加密存储）
- **accessLogs**：访问日志表（统计端点访问情况）

#### 迁移工作流

```bash
# 1. 修改 src/db/schema.ts
# 2. 生成迁移文件
pnpm db:generate

# 3. 查看生成的 SQL（drizzle/ 目录）
# 4. 应用迁移
pnpm db:migrate         # 本地
pnpm db:migrate:prod    # 生产
```

### 5. 主题系统（Material-UI）

**集中化主题管理**：所有主题定义在 `frontend/src/theme/index.ts`

#### 规则

1. **定义自定义主题属性**：在 `theme/types.ts` 中扩展 MUI 主题类型
2. **集中配置**：所有主题相关样式在 `lightTheme` 和 `darkTheme` 中定义
3. **禁止条件判断**：组件**不允许**使用 `theme.palette.mode === 'dark'` 这样的条件
4. **正确方式**：直接使用预定义的主题属性，如 `theme.pageBackground`

#### 使用方法

```typescript
import { useAppTheme } from '@/context/ThemeContextProvider';

function MyComponent() {
  const { theme, toggleTheme } = useAppTheme();

  return (
    <Box sx={{ backgroundColor: theme.pageBackground }}>
      {/* 正确：使用主题属性 */}
    </Box>
  );
}
```

### 6. 认证与权限系统

#### 认证流程

**GitHub OAuth → Session Token → Cookie 认证**

#### 后端 API（`src/routes/auth.ts`）

- `GET /api/auth/github` - 生成 GitHub OAuth 授权 URL
- `GET /api/auth/github/callback` - 处理 OAuth 回调，创建会话
- `GET /api/auth/me` - 获取当前用户信息（需认证）
- `POST /api/auth/logout` - 登出（需认证）
- `POST /api/auth/regenerate-key` - 重新生成 Platform API Key（需认证）

#### 前端 Hook（`frontend/src/hooks/useAuth.ts`）

```typescript
const { user, isAuthenticated, isLoading, login, logout, refetch } = useAuth();
```

- 跨标签页同步（通过 `localStorage` + `storage-event`）
- SSR 安全的 localStorage 封装（`utils/storage.ts`）

#### 中间件（`src/middleware/`）

1. **authMiddleware**：验证会话 token，注入用户信息到 context
2. **activationMiddleware**：检查用户是否已激活
   - **仅应用于**：`/api/endpoints/:id/publish`（发布端点）
   - **不应用于**：创建、编辑、删除端点等管理接口
3. **adminMiddleware**：验证管理员角色

#### 用户激活机制

根据设计文档：

- **未激活用户**：可以创建、编辑端点，管理权限组，查看所有界面
- **唯一限制**：无法**发布**端点（`is_published` 字段无法设为 `true`）
- **激活后**：可以发布端点，使其通过 `/e/:username/:path` 访问

### 7. API 开发标准流程

**必须遵循以下模式**：

#### Step 1：定义 Schema（`common/validators/`）

```typescript
// common/validators/feature.schema.ts
import { z } from "zod";

export const CreateFeatureSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["typeA", "typeB"]),
});

export const FeatureSchema = CreateFeatureSchema.extend({
  id: z.string(),
  createdAt: z.string().datetime(),
});
```

#### Step 2：推导类型（`common/types/index.ts`）

```typescript
export type Feature = z.infer<typeof FeatureSchema>;
export type CreateFeatureInput = z.infer<typeof CreateFeatureSchema>;
```

#### Step 3：创建路由（`src/routes/feature.ts`）

```typescript
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { FeatureSchema, CreateFeatureSchema } from "../../common/validators/feature.schema";

const app = new OpenAPIHono();

const createRoute = createRoute({
  method: "post",
  path: "/features",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateFeatureSchema },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": { schema: FeatureSchema },
      },
      description: "创建成功",
    },
  },
  tags: ["Features"],
});

app.openapi(createRoute, async (c) => {
  const data = c.req.valid("json");
  const db = c.get("db");

  // 实现业务逻辑
  const result = await db.insert(features).values(data).returning();

  return c.json(result[0], 201);
});

export default app;
```

#### Step 4：注册路由（`src/routes/api.ts`）

```typescript
import feature from "./feature";

const api = new OpenAPIHono().use("*", dbMiddleware).route("/features", feature);
// ...其他路由
```

#### Step 5：创建前端 Hook（`frontend/src/hooks/useFeature.ts`）

```typescript
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Feature, CreateFeatureInput } from "../../../common/types";

export function useCreateFeature() {
  return useMutation({
    mutationFn: async (data: CreateFeatureInput) => {
      const response = await fetch(`${getApiBase()}/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json() as Promise<ApiResponse<Feature>>;
    },
  });
}
```

### 8. SSR 兼容性（Cloudflare Workers 专属）

#### 关键配置（`frontend/vite.config.mts`）

**必须**在 `ssr.noExternal` 中显式声明需要 SSR 处理的库：

```typescript
export default defineConfig({
  ssr: {
    noExternal: [
      "react-router-dom",
      "@mui/material",
      "@mui/system",
      "@mui/icons-material",
      "@emotion/react",
      "@emotion/styled",
      "react-i18next",
      "i18next",
      // 所有 React 生态库都需要添加
    ],
  },
});
```

**原因**：Cloudflare Workers 环境与 Node.js 不同，React 生态库必须被 Vite 处理才能在 SSR 中正常工作。

#### Assets Binding（`wrangler.jsonc`）

```jsonc
{
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist/client",
  },
}
```

- 使用现代化的 `assets` binding（**禁止**使用已废弃的 `site.bucket`）
- 生产环境通过 `c.env.ASSETS.fetch()` 服务静态文件

### 9. 树形端点管理（NekroEndpoint 特色功能）

根据设计文档，端点采用**纯粹的层次结构**：

#### 数据模型

```typescript
// endpoints 表
{
  id: string,
  parent_id: string | null,  // null 表示根节点
  path: string,              // 相对路径，如 /api/config
  name: string,              // 显示名称
  type: 'static' | 'proxy' | 'script',
  sort_order: number,        // 手动排序
  // ...
}
```

#### 排序规则

1. **优先**：按 `sort_order` 字段排序（用户手动拖拽后更新）
2. **其次**：按名称字母顺序（中文按拼音）

#### 树结构特点

- **每个节点都是完整的端点**，无论是否有子节点
- 有子节点的端点（容器节点）：既可以配置自己的内容，也可以包含子端点
- 无子节点的端点（叶子节点）：仅配置自己的内容
- 类型只是端点的属性，与树结构无关

#### 前端实现

- 使用 `@mui/x-tree-view` 组件（已添加依赖）
- 右键菜单：新建子端点、删除、发布/取消发布
- 配合 Monaco Editor 编辑端点内容

### 10. 权限组与访问密钥系统

根据设计文档，这是 Phase 2 的核心功能。

#### 数据流

```
用户 → 权限组 → 访问密钥
           ↓
         端点
```

#### 使用流程

1. **创建权限组**：如 "VIP客户"、"免费试用"
2. **生成访问密钥**：
   - 格式：`ep-<32位随机字符串>`
   - 支持备注（`description`）
   - 支持到期时间（`expires_at`）
   - **仅在创建时返回明文**，后续无法再查看
3. **端点关联权限组**：在端点的 `required_permission_groups` 字段中指定
4. **客户端访问**：携带密钥访问端点
   - HTTP Header: `Authorization: Bearer ep-xxx`
   - 或 Query 参数: `?token=ep-xxx`

#### API 设计（参考 design.md）

- `GET /api/permission-groups` - 列出权限组
- `POST /api/permission-groups` - 创建权限组
- `POST /api/permission-groups/:groupId/keys` - 生成访问密钥
- `POST /api/access-keys/:id/revoke` - 撤销密钥

### 11. 端点执行层（公开访问）

#### 访问路径

```
/e/:username/:path/*
```

例如：`https://ep.nekro.ai/e/alice/clash-config`

#### 执行逻辑（`src/routes/execution.ts`）

1. 解析用户名和路径
2. 查询数据库获取端点配置
3. 检查发布状态（`is_published`）
4. 验证访问控制：
   - `public`：直接返回
   - `authenticated`：验证 Access Key
5. 根据端点类型执行：
   - **static**：返回 `config.content`
   - **proxy**：转发到 `config.target_url_template`
   - **script**：执行沙箱脚本（Phase 3）
6. 记录访问日志（`accessLogs` 表）

## 常见开发任务

### 添加新的 API 端点

1. 在 `src/db/schema.ts` 中定义数据表（如需要）
2. 运行 `pnpm db:generate && pnpm db:migrate`
3. 在 `common/validators/` 中创建 Zod Schema
4. 在 `common/types/index.ts` 中推导类型
5. 在 `src/routes/` 中创建路由文件，使用 `createRoute`
6. 在 `src/routes/api.ts` 中注册路由
7. 在 `frontend/src/hooks/` 中创建 React Query hook
8. 访问 `http://localhost:8787/doc` 查看 Swagger 文档

### 添加新页面

1. 创建 `frontend/src/pages/NewPage.tsx`
2. 在 `frontend/src/routes.tsx` 中导入并添加路由：

```typescript
import NewPage from './pages/NewPage';
<Route path="new-page" element={<NewPage />} />
```

3. 完成（自动支持 SSR 和 CSR）

### 保护路由（需要认证）

**后端**：

```typescript
import { authMiddleware } from "../middleware/auth";

protectedRoutes.use("/*", authMiddleware);
```

**前端**：

```typescript
const { isAuthenticated } = useAuth();
if (!isAuthenticated) return <Navigate to="/" />;
```

### 仅限管理员访问

**后端**：

```typescript
import { adminMiddleware } from "../middleware/admin";

adminRoutes.use("/*", adminMiddleware);
```

### 调试生产构建

```bash
# 本地模拟生产环境
pnpm serve:prod

# 或手动执行
pnpm build
wrangler dev --env production
```

## 环境变量配置

### 本地开发（`.dev.vars`）

```bash
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
APP_BASE_URL=http://localhost:8787
SESSION_SECRET=your_session_secret
ENCRYPTION_KEY=your_encryption_key
```

### 生产环境（Cloudflare Dashboard 或 `wrangler.jsonc`）

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `APP_BASE_URL`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `NODE_ENV`（自动设为 "production"）

## 项目特定规则

### 必须遵守

1. **更新文档**：架构变更后，立即更新 `.cursor/rules/global.mdc`
2. **统一路由**：始终使用 `frontend/src/routes.tsx` 定义路由
3. **Schema 优先**：先在 `common/validators/` 定义 Zod Schema，再实现 API
4. **禁止直接操作 DOM**：使用 React 声明式编程（入口文件除外）
5. **使用主题属性**：禁止 `theme.palette.mode` 条件判断，使用预定义属性
6. **类型导入**：从 `common/types/` 导入类型，从 `common/validators/` 导入 Schema
7. **统一响应格式**：

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code?: string; message?: string; details?: unknown };
}
```

8. **禁止 Hacky 修复**：不使用 `@ts-ignore`，从根源解决问题
9. **SSR 安全**：所有 `localStorage` 操作使用 `utils/storage.ts` 封装
10. **激活中间件**：仅对发布端点应用 `activationMiddleware`，不阻止管理操作

### 禁止行为

1. ❌ 假设开发环境下 `frontend/dist` 存在
2. ❌ 使用废弃的 `site.bucket` 配置
3. ❌ 在前端 hooks 中重复定义类型
4. ❌ 硬编码 API 基础路径（使用 `getApiBase()`）
5. ❌ 遗漏 `ssr.noExternal` 声明
6. ❌ 跳过 Schema 生成直接修改数据库
7. ❌ 阻止未激活用户创建/编辑端点（仅限制发布）

### 遇到构建问题时

1. **开发环境失败**：检查 Wrangler 日志，确认代理到 `:5173` 正常
2. **生产 SSR 失败**：检查 `dist/server/` 是否存在，验证 `ssr.noExternal` 配置
3. **资源加载失败**：检查 `wrangler.jsonc` 的 `assets` binding，验证 MIME 类型
4. **类型错误**：运行 `pnpm typecheck`

### Cloudflare Workers 特性

1. **无 Node.js API**：不能使用 `fs`、`path`、`process`（除非通过 `nodejs_compat` flag）
2. **冷启动优化**：保持 bundle 体积小，使用动态 import
3. **静态资源**：通过 `ASSETS` binding 服务 `dist/client` 文件
4. **数据库**：D1 基于 SQLite，使用 Drizzle ORM
5. **Bindings**：通过 `c.env.DB`、`c.env.ASSETS` 访问

## 文档体系

- **README.md**：快速开始（5分钟）
- **docs/INSTALLATION.md**：详细安装指南
- **docs/AUTHENTICATION.md**：GitHub OAuth 集成
- **docs/DEVELOPMENT.md**：日常开发流程
- **docs/API_GUIDE.md**：完整 API 开发指南
- **docs/THEMING.md**：主题系统定制
- **docs/DEPLOYMENT.md**：生产部署
- **docs/PROJECT_STRUCTURE.md**：代码架构和类型系统
- **docs/SEO_GUIDE.md**：SEO 配置
- **.cursor/trace/design.md**：NekroEndpoint 产品设计文档（总设计规范）
- **.cursor/rules/global.mdc**：AI 助手工作指导手册

添加新功能时，同步更新相关文档。

## 系统初始化

**首次部署后，必须访问 `/init` 页面完成管理员分配。**

#### 初始化流程

1. 访问 `http://localhost:8787/init`（或生产环境 `/init`）
2. 系统检查是否存在管理员
3. 如果无用户：点击 "使用 GitHub 登录" 注册
4. 从用户列表中选择一个用户，点击 "设置为管理员"
5. 系统设置用户为管理员（`role='admin'`）并激活（`is_activated=true`）
6. 3秒后自动跳转到首页
7. 初始化完成后，`/init` 端点被禁用（安全措施）

这种可视化方式替代了手动执行 SQL 命令。

## API 基础路径配置

**集中化配置**（`common/config/api.ts`）：

- 生产环境（SSR）：`/api`
- 开发环境：`http://localhost:8787/api`

**始终**使用 `getApiBase()` 获取基础路径，**禁止**硬编码。

## 关键文件索引

- **入口**：`src/index.ts` - Hono 应用主入口
- **API 注册**：`src/routes/api.ts` - 所有 API 路由在此注册
- **数据库 Schema**：`src/db/schema.ts` - 数据库结构唯一定义
- **路由配置**：`frontend/src/routes.tsx` - 统一路由定义
- **认证 Hook**：`frontend/src/hooks/useAuth.ts` - 认证状态管理
- **主题配置**：`frontend/src/theme/index.ts` - 亮/暗主题定义
- **Wrangler 配置**：`wrangler.jsonc` - Cloudflare Workers 配置
- **Vite 配置**：`frontend/vite.config.mts` - 前端构建配置
- **设计文档**：`.cursor/trace/design.md` - 产品设计总规范
- **工作手册**：`.cursor/rules/global.mdc` - AI 助手工作指南

## OpenAPI 文档

开发环境访问 Swagger UI：`http://localhost:8787/doc`

所有使用 `createRoute` 定义的路由自动生成 API 文档。

---

**重要提醒**：这是一个生产级的边缘端点编排平台，强调类型安全、开发体验和可维护性。遇到问题时，优先查阅 `src/routes/` 和 `frontend/src/hooks/` 中的现有模式，遵循既定架构。
