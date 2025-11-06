# Edgent — 产品设计文档

**最后更新**: 2025-10-31  
**项目归属**: NekroAI  
**域名（默认）**: edgent.nekro.ai **技术基础**: NekroEdge 模板（Hono + React + D1 + Material-UI）

---

## 1. 产品定位

Edgent 是一个**开源的边缘端点托管平台**，供手动验证的用户在边缘快速部署三类服务：

- **静态端点**：托管文本/配置文件（如规则列表、配置片段）
- **代理端点**：转发请求到目标地址（如加速 GitHub raw 内容）
- **脚本端点**：运行自定义 JS 脚本（Phase 2，需沙箱）

**技术栈**（基于 NekroEdge 模板）：

- 后端：Hono + D1 + Drizzle ORM
- 前端：React + Material-UI + Monaco Editor
- 部署：Cloudflare Workers + Pages

---

## 2. 核心约束

- **用户激活制**：管理员手动激活后才能发布端点
- **开源自托管**：面向小规模使用，无配额/计费

---

## 3. 核心功能（产品层）

### 3.1 认证与激活

- GitHub OAuth 登录
- **未激活用户**：可查看界面，不可发布
- **激活用户**：可发布端点
- **管理员**：
  - 可激活/停用用户
  - 可查看所有用户的端点树和具体内容（用于安全审查）
  - 可强制下线任何端点

### 3.2 双层密钥机制

**Platform API Key（管理凭证）**:

- 用于操作平台功能（创建/编辑端点、管理权限组）
- 不对外分发

**Endpoint Access Key（服务凭证）**:

- 用于访问用户发布的端点
- 通过权限组管理，可对外分发

### 3.3 端点类型

- **静态端点**：托管文本内容
- **代理端点**：转发请求到目标 URL
- **脚本端点**：运行自定义 JS（Phase 3）

### 3.4 树形端点编辑器

**布局**: 左侧树视图 + 右侧编辑器（Monaco Editor）

**树结构说明**:

- 纯粹的层次结构，由用户自由组织
- **每个节点都是一个完整的端点**，无论是否有子节点：
  - 有子节点的端点（容器节点）：既可以配置自己的内容，也可以包含子端点
  - 无子节点的端点（叶子节点）：仅配置自己的内容
- 类型（静态/代理/脚本）只是端点的属性，与树结构无关
- **排序规则**：
  - 优先按 `sortOrder` 字段排序（用户手动调整顺序后使用）
  - 其次按名称字母顺序排列（中文拼音顺序）
- 示例：
  ```
  我的端点/
    ├─ API集合 [静态]           ← 容器节点，本身也是一个端点
    │   ├─ GitHub代理 [代理]
    │   └─ 配置文件 [静态]
    └─ 测试脚本 [脚本]
  ```

**功能**:

- 右键菜单（新建子端点、删除）
- 点击节点查看/编辑配置
- 实时保存提示
- 发布/取消发布控制

### 3.5 权限组系统

**数据模型**:

```
用户 → 权限组 → 访问密钥
           ↓
         端点
```

**流程**:

1. 创建权限组（如 "VIP客户"）
2. 生成访问密钥（格式：`ep-<随机字符串>`，支持备注、到期时间）
3. 端点关联权限组
4. 客户端携带密钥访问：`Authorization: Bearer ep-xxx` 或 `?token=ep-xxx`

### 3.6 其他功能

- **访问路径**: `/e/{username}/{path}`
- **环境变量**: 加密存储，用于模板替换
- **访问控制**: 公开 / 需要鉴权

---

## 4. 架构概览

- **执行层**: Cloudflare Workers 处理 `/e/{username}/*` 请求
- **数据层**: D1 存储用户/端点配置
- **控制面**: Hono API 提供管理接口
- **隔离**: 脚本端点沙箱化（Phase 3）

---

## 5. 数据模型设计（基于 Drizzle ORM）

为便于与 D1 数据库和 Drizzle ORM 对齐，给出每个资源的**字段清单**。

### User（用户表）

```typescript
// 对应 Drizzle Schema
{
  id: text("id").primaryKey(),  // UUID
  username: text("username").notNull().unique(),  // GitHub 用户名
  email: text("email"),
  avatar_url: text("avatar_url"),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  is_activated: integer("is_activated", { mode: "boolean" }).notNull().default(false),

  // Platform API Key (用户管理平台的密钥)
  platform_api_key: text("platform_api_key"),  // 哈希存储
  platform_api_key_created_at: integer("platform_api_key_created_at"),  // Unix 时间戳

  created_at: integer("created_at").notNull(),  // Unix 时间戳
  updated_at: integer("updated_at").notNull(),
  last_login_at: integer("last_login_at"),
}
```

**说明**:

- `platform_api_key`: 用户管理平台的 API 密钥（哈希后存储）
- 使用 SQLite 的 `integer` 类型存储时间戳（Drizzle 模式）

### Endpoint（端点表）

```typescript
{
  id: text("id").primaryKey(),  // UUID
  owner_user_id: text("owner_user_id").notNull().references(() => users.id),
  parent_id: text("parent_id"),  // 🆕 支持树形结构，null 表示根节点

  path: text("path").notNull(),  // 相对路径，如 /clash-config
  name: text("name").notNull(),  // 显示名
  type: text("type", { enum: ["static", "proxy", "script"] }).notNull(),

  // 端点配置（JSON 存储，根据 type 不同结构不同）
  config: text("config").notNull(),  // JSON string

  // 访问控制
  access_control: text("access_control", { enum: ["public", "authenticated"] })
    .notNull().default("public"),
  required_permission_groups: text("required_permission_groups"),  // 🆕 JSON array of group_ids

  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  is_published: integer("is_published", { mode: "boolean" }).notNull().default(false),

  // 排序字段（支持树节点手动排序）
  sort_order: integer("sort_order").notNull().default(0),  // 🆕

  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
}

// 复合索引
index("endpoint_owner_path_idx").on(owner_user_id, path).unique()
index("endpoint_parent_idx").on(parent_id)
```

**config 字段结构示例**:

```typescript
// 静态端点
{
  content: string,
  response_headers: { [key: string]: string },
  cache_control?: string,
}

// 代理端点
{
  target_url_template: string,  // 如 "https://raw.githubusercontent.com/${path}"
  path_mapping?: { [pattern: string]: string },
  request_headers?: { [key: string]: string },
  response_headers?: { [key: string]: string },
}

// 脚本端点 (Phase 2)
{
  script_content: string,
  timeout_ms: number,
  allowed_domains?: string[],
}
```

### PermissionGroup（权限组表）🆕

```typescript
{
  id: text("id").primaryKey(),  // UUID
  owner_user_id: text("owner_user_id").notNull().references(() => users.id),
  name: text("name").notNull(),  // 如 "VIP用户"、"免费试用"
  description: text("description"),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
}

index("perm_group_owner_idx").on(owner_user_id)
```

### AccessKey（访问密钥表）

```typescript
{
  id: text("id").primaryKey(),  // UUID
  permission_group_id: text("permission_group_id").notNull()
    .references(() => permission_groups.id, { onDelete: "cascade" }),

  key_value: text("key_value").notNull().unique(),  // 密钥哈希值

  description: text("description"),  // 备注
  expires_at: integer("expires_at"),  // 过期时间（Unix 时间戳），null 表示永久
  is_active: integer("is_active", { mode: "boolean" }).notNull().default(true),

  last_used_at: integer("last_used_at"),  // 最后使用时间
  usage_count: integer("usage_count").notNull().default(0),  // 使用次数统计

  created_at: integer("created_at").notNull(),
}

index("access_key_group_idx").on(permission_group_id)
```

**密钥格式**: `ep-<32位随机字符串>`（如 `ep-a7b3c9d2e1f4g5h6...`）

### EnvVar（环境变量表）

```typescript
{
  id: text("id").primaryKey(),  // UUID
  user_id: text("user_id").notNull().references(() => users.id),
  key: text("key").notNull(),
  value: text("value").notNull(),  // 加密存储
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
}

unique("env_var_user_key_idx").on(user_id, key)
```

### AccessLog（访问日志表）

```typescript
{
  id: text("id").primaryKey(),  // UUID
  endpoint_id: text("endpoint_id").notNull().references(() => endpoints.id),
  access_key_id: text("access_key_id"),  // 使用的密钥 ID（如适用）

  timestamp: integer("timestamp").notNull(),
  status: integer("status").notNull(),  // HTTP 状态码
  method: text("method").notNull(),

  ip_address: text("ip_address"),
  country: text("country"),  // Cloudflare 提供的地理信息
  user_agent: text("user_agent"),

  response_time_ms: integer("response_time_ms"),
}

index("access_log_endpoint_idx").on(endpoint_id)
index("access_log_timestamp_idx").on(timestamp)
```

### OAuth Session（OAuth 会话表）

```typescript
{
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull().default("github"),

  access_token: text("access_token").notNull(),  // 加密存储
  refresh_token: text("refresh_token"),
  expires_at: integer("expires_at"),

  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
}

index("oauth_session_user_idx").on(user_id)
```

---

## 6. API 设计规范（RESTful + OpenAPI）

所有 API 均使用 Hono + @hono/zod-openapi 实现，确保类型安全和自动文档生成。

### 6.1 认证与用户管理

#### OAuth 认证

- `GET /api/auth/github` — 发起 GitHub OAuth 登录
- `GET /api/auth/callback` — GitHub OAuth 回调处理
- `POST /api/auth/logout` — 登出当前用户
- `GET /api/auth/me` — 获取当前用户信息

#### 平台 API 密钥管理

- `POST /api/user/api-key/generate` — 生成新的平台管理密钥（替换旧密钥）
- `DELETE /api/user/api-key` — 撤销当前平台管理密钥
- `GET /api/user/api-key/info` — 查看密钥创建时间（不返回密钥本身）

### 6.2 端点管理（Endpoints）

#### 基础 CRUD

- `GET /api/endpoints` — 列出当前用户所有端点（树形结构）
  - 查询参数: `?flat=true` 返回扁平列表，默认返回树结构
- `POST /api/endpoints` — 创建新端点
  - 请求体: `{ name, type, path, parent_id?, config }`
- `GET /api/endpoints/:id` — 获取端点详情
- `PATCH /api/endpoints/:id` — 更新端点配置
- `DELETE /api/endpoints/:id` — 删除端点（级联删除子节点）

#### 发布与状态管理

- `POST /api/endpoints/:id/publish` — 发布端点（需已激活用户）
- `POST /api/endpoints/:id/unpublish` — 取消发布
- `PATCH /api/endpoints/:id/toggle` — 快速启用/禁用端点

#### 树结构操作 🆕

- `PATCH /api/endpoints/:id/move` — 移动端点到新父节点
  - 请求体: `{ parent_id: string | null, sort_order?: number }`
- `POST /api/endpoints/reorder` — 批量调整端点排序
  - 请求体: `{ endpoint_orders: [{ id, sort_order }] }`

### 6.3 权限组管理（Permission Groups）🆕

- `GET /api/permission-groups` — 列出当前用户的所有权限组
- `POST /api/permission-groups` — 创建新权限组
  - 请求体: `{ name, description? }`
- `GET /api/permission-groups/:id` — 获取权限组详情（含关联端点和密钥列表）
- `PATCH /api/permission-groups/:id` — 更新权限组信息
- `DELETE /api/permission-groups/:id` — 删除权限组（级联删除所有密钥）

### 6.4 访问密钥管理（Access Keys）🆕

- `GET /api/permission-groups/:groupId/keys` — 列出权限组的所有密钥
- `POST /api/permission-groups/:groupId/keys` — 生成新密钥
  - 请求体: `{ description?, expires_at?: timestamp }`
  - 响应: **仅在创建时返回完整密钥明文**，之后无法再次获取
- `PATCH /api/access-keys/:id` — 更新密钥（修改备注、到期时间）
- `POST /api/access-keys/:id/revoke` — 撤销密钥（设置 is_active=false）
- `DELETE /api/access-keys/:id` — 永久删除密钥

### 6.5 环境变量管理

- `GET /api/env-vars` — 列出当前用户的环境变量（不返回 value）
- `POST /api/env-vars` — 创建新环境变量
  - 请求体: `{ key, value }`
- `PUT /api/env-vars/:key` — 更新环境变量值
- `DELETE /api/env-vars/:key` — 删除环境变量

### 6.6 管理员接口（Admin Only）

#### 用户管理

- `GET /api/admin/users` — 列出所有用户（分页）
- `POST /api/admin/users/:id/activate` — 激活用户
- `POST /api/admin/users/:id/deactivate` — 停用用户
- `DELETE /api/admin/users/:id` — 删除用户

#### 端点审查（安全审计）

- `GET /api/admin/users/:userId/endpoints` — 查看指定用户的完整端点树
- `GET /api/admin/endpoints/:id` — 查看任意端点的详细内容和配置
- `POST /api/admin/endpoints/:id/force-unpublish` — 强制下线端点

#### 系统统计

- `GET /api/admin/stats` — 系统统计（用户数、端点数、请求量等）

### 6.7 公开端点访问（Execution Layer）

- `GET|POST|PUT|DELETE /e/:username/:path/*` — 访问用户发布的端点
  - 鉴权方式:
    - HTTP Header: `Authorization: Bearer <access_key>`
    - 或 Query 参数: `?token=<access_key>`
  - 响应根据端点类型和配置动态生成

### 错误码规范

```typescript
// 标准错误响应格式
{
  code: number,       // HTTP 状态码
  error: string,      // 错误类型（如 "unauthorized", "not_found"）
  message: string,    // 用户友好的错误描述
  details?: any,      // 额外的错误细节（可选）
}

// 常见错误码映射
200 OK               — 成功
201 Created          — 创建成功
400 Bad Request      — 请求参数错误
401 Unauthorized     — 未认证或认证失败
403 Forbidden        — 无权限执行操作
404 Not Found        — 资源不存在
409 Conflict         — 资源冲突（如重复创建）
422 Unprocessable    — 数据验证失败（Zod 错误）
429 Too Many Requests — 速率限制
500 Internal Error   — 服务器内部错误
```

---

## 7. 安全实现要点

### 7.1 认证

- GitHub OAuth + HttpOnly Cookie 会话管理
- 密钥哈希存储（使用 Web Crypto API 的 PBKDF2，避免 bcrypt 性能问题）

### 7.2 权限控制

```typescript
// 认证中间件
app.use("/api/*", authMiddleware);
// 激活检查
app.use("/api/endpoints/*/publish", activationMiddleware);
// 管理员权限
app.use("/api/admin/*", adminMiddleware);
```

### 7.3 数据加密

- 环境变量：AES-GCM 加密存储
- OAuth Token：加密存储

---

## 8. 技术实现要点

### 8.1 前端架构

**页面结构**:

- `pages/auth/` - OAuth 登录回调
- `pages/dashboard/` - 端点管理、权限组
- `pages/admin/` - 用户管理
- `components/endpoints/` - 树形编辑器、Monaco Editor
- `components/permissions/` - 权限组卡片、密钥列表

**状态管理**: React Query（已集成）

**新增依赖**:

```bash
pnpm add @mui/x-tree-view @monaco-editor/react @dnd-kit/core @dnd-kit/sortable uuid
```

### 8.2 后端架构

**路由组织**:

```
src/routes/
  ├── auth.ts         # OAuth
  ├── endpoints.ts    # 端点 CRUD
  ├── permission-groups.ts
  ├── execution.ts    # /e/* 执行层
  └── admin.ts
```

**Bindings 扩展**（`src/types.ts`）:

```typescript
GITHUB_CLIENT_ID: string;
GITHUB_CLIENT_SECRET: string;
SESSION_SECRET: string;
ENCRYPTION_KEY: string;
```

---

## 9. 关键技术问题

### 9.1 Monaco Editor SSR 问题

使用动态导入禁用 SSR 或在 vite.config 中排除

### 9.2 树形结构循环引用

更新 parent_id 时递归检查防止循环

### 9.3 密钥哈希性能

使用 PBKDF2（Web Crypto API）替代 bcrypt

---

## 10. 开发任务清单

### Phase 1 — MVP（基础功能）

#### 后端

- [ ] 数据库 Schema（users, endpoints, oauth_sessions）
- [ ] GitHub OAuth 认证流程
- [ ] 端点 CRUD API（静态、代理）
- [ ] 端点执行层（`/e/:username/:path`）
- [ ] 管理员激活用户 API

#### 前端

- [ ] OAuth 登录/回调页面
- [ ] 树形端点编辑器（TreeView + Monaco Editor）
- [ ] 静态端点编辑器
- [ ] 代理端点配置表单
- [ ] 用户设置页面
- [ ] 管理员用户列表

### Phase 2 — 权限组系统

#### 后端

- [ ] 权限组/访问密钥表结构
- [ ] 平台 API Key 管理
- [ ] 权限组 CRUD API
- [ ] 访问密钥生成/撤销 API
- [ ] 端点鉴权逻辑

#### 前端

- [ ] 权限组管理界面
- [ ] 访问密钥列表
- [ ] 端点权限组选择器

### Phase 3 — 脚本端点（可选）

- [ ] 沙箱隔离实现
- [ ] 脚本端点执行引擎
- [ ] Monaco Editor TypeScript 支持

---

**最后更新**: 2025-10-31
