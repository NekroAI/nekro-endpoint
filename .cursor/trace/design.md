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

**实现状态标识**：

- ✅ 已实现
- ❌ 未实现
- ⚠️ 部分实现或与设计有差异

### User（用户表）✅

```typescript
// 对应 Drizzle Schema
{
  id: text("id").primaryKey(),  // cuid2
  githubId: text("github_id").notNull().unique(),  // GitHub 用户 ID
  username: text("username").notNull(),  // GitHub 用户名
  email: text("email"),
  avatarUrl: text("avatar_url"),

  // Platform API Key (用户管理平台的密钥)
  apiKey: text("api_key").notNull().unique(),  // 格式: sec-{64位十六进制}

  role: text("role").notNull().default("user"),  // user | admin
  isActivated: integer("is_activated", { mode: "boolean" }).notNull().default(false),

  platformApiKey: text("platform_api_key"),  // PBKDF2 哈希存储
  platformApiKeyCreatedAt: integer("platform_api_key_created_at", { mode: "timestamp" }),

  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}
```

**实现说明**:

- **apiKey**: 用户基础 API 密钥，格式为 `sec-{64位十六进制}`（与设计文档的 `ak-` 前缀不同）
- **platformApiKey**: 平台管理密钥，使用 PBKDF2 哈希存储（符合设计）
- **githubId**: 存储 GitHub 用户 ID（实际实现新增字段）
- 时间戳字段使用 Drizzle 的 `{ mode: "timestamp" }` 模式

### Endpoint（端点表）✅

```typescript
{
  id: text("id").primaryKey(),  // cuid2
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),  // 支持树形结构，null 表示根节点

  path: text("path").notNull(),  // 端点路径，如 /clash-config
  name: text("name").notNull(),  // 显示名称
  type: text("type").notNull(),  // static | proxy | script

  // 端点配置（JSON 存储，根据 type 不同结构不同）
  config: text("config").notNull(),  // JSON string

  // 访问控制
  accessControl: text("access_control").notNull().default("public"),  // public | authenticated
  requiredPermissionGroups: text("required_permission_groups"),  // JSON array of group_ids

  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),

  // 排序字段（支持树节点手动排序）
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}

// 索引
index("endpoint_owner_idx").on(ownerUserId)
index("endpoint_parent_idx").on(parentId)
unique("endpoint_owner_path_idx").on(ownerUserId, path)
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

### PermissionGroup（权限组表）✅

```typescript
{
  id: text("id").primaryKey(),  // cuid2
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),  // 如 "VIP用户"、"免费试用"
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}

index("perm_group_owner_idx").on(ownerUserId)
```

### AccessKey（访问密钥表）⚠️

```typescript
{
  id: text("id").primaryKey(),  // cuid2
  permissionGroupId: text("permission_group_id").notNull()
    .references(() => permissionGroups.id, { onDelete: "cascade" }),

  keyValue: text("key_value").notNull().unique(),  // ⚠️ 明文存储（与设计不同）

  description: text("description"),  // 备注
  expiresAt: integer("expires_at", { mode: "timestamp" }),  // 过期时间，null 表示永久
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),  // 最后使用时间
  usageCount: integer("usage_count").notNull().default(0),  // 使用次数统计

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}

index("access_key_group_idx").on(permissionGroupId)
```

**密钥格式**: `ep-{32位十六进制字符串}`（如 `ep-a7b3c9d2e1f4g5h6...`）

**⚠️ 关键实现差异**：

- **设计文档**：密钥应使用 PBKDF2 哈希存储
- **实际实现**：密钥**明文存储**在 `keyValue` 字段
- **验证方式**：直接字符串比较（`accessKey === key.keyValue`）
- **原因**：简化验证逻辑，避免哈希计算开销
- **影响**：降低了安全性，但适合非敏感场景（仅用于端点访问控制）
- **建议**：如需提升安全性，可参考 `src/utils/encryption.ts` 中的 `hashAccessKey()` 函数

### AccessLog（访问日志表）❌ 未实现

**状态**：监控统计功能，表结构和 API 均未实现

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

### UserSession（用户会话表）✅ 实际实现

**状态**：使用 `userSessions` 表管理会话，未单独存储 OAuth token

```typescript
{
  id: text("id").primaryKey(),  // cuid2
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),  // 会话令牌（cuid2）
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),  // 过期时间（30天）
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}

index("user_sessions_session_token_idx").on(sessionToken)
index("user_sessions_user_id_idx").on(userId)
```

**实现说明**：

- **会话管理**：使用 cuid2 生成的 sessionToken，有效期 30 天
- **OAuth Token**：不存储 GitHub access_token，仅在登录时使用
- **认证方式**：通过 `Authorization: Bearer {sessionToken}` 进行认证
- **自动清理**：过期会话通过中间件自动拒绝访问

---

## 6. API 设计规范（RESTful + OpenAPI）

所有 API 均使用 Hono + @hono/zod-openapi 实现，确保类型安全和自动文档生成。

**实现状态标识**：

- ✅ 已完整实现
- ⚠️ 部分实现或有差异
- ❌ 未实现

### 6.1 认证与用户管理 ⚠️

#### OAuth 认证 ✅

- `GET /api/auth/github` — 发起 GitHub OAuth 登录 ✅
- `GET /api/auth/callback` — GitHub OAuth 回调处理 ✅
- `POST /api/auth/logout` — 登出当前用户 ✅
- `GET /api/auth/me` — 获取当前用户信息 ✅

#### 平台 API 密钥管理 ⚠️

- `POST /api/user/api-key/generate` — 生成新的平台管理密钥（替换旧密钥）✅
  - 实际路由：`POST /api/auth/regenerate-key`
- `DELETE /api/user/api-key` — 撤销当前平台管理密钥 ❌ 未实现
- `GET /api/user/api-key/info` — 查看密钥创建时间（不返回密钥本身）❌ 未实现

### 6.2 端点管理（Endpoints）✅

#### 基础 CRUD ✅

- `GET /api/endpoints` — 列出当前用户所有端点（树形结构）✅
  - 查询参数: `?flat=true` 返回扁平列表，默认返回树结构 ✅
- `POST /api/endpoints` — 创建新端点 ✅
  - 请求体: `{ name, type, path, parent_id?, config }` ✅
- `GET /api/endpoints/:id` — 获取端点详情 ✅
- `PATCH /api/endpoints/:id` — 更新端点配置 ✅
- `DELETE /api/endpoints/:id` — 删除端点（级联删除子节点）✅

#### 发布与状态管理 ✅

- `POST /api/endpoints/:id/publish` — 发布端点（需已激活用户）✅
- `POST /api/endpoints/:id/unpublish` — 取消发布 ✅
- `PATCH /api/endpoints/:id/toggle` — 快速启用/禁用端点 ✅

#### 树结构操作 ✅

- `PATCH /api/endpoints/:id/move` — 移动端点到新父节点 ✅
  - 请求体: `{ parent_id: string | null, sort_order?: number }` ✅
- `POST /api/endpoints/reorder` — 批量调整端点排序 ✅
  - 请求体: `{ endpoint_orders: [{ id, sort_order }] }` ✅

### 6.3 权限组管理（Permission Groups）✅

- `GET /api/permission-groups` — 列出当前用户的所有权限组 ✅
- `POST /api/permission-groups` — 创建新权限组 ✅
  - 请求体: `{ name, description? }` ✅
- `GET /api/permission-groups/:id` — 获取权限组详情（含关联端点和密钥列表）✅
- `PATCH /api/permission-groups/:id` — 更新权限组信息 ✅
- `DELETE /api/permission-groups/:id` — 删除权限组（级联删除所有密钥）✅

### 6.4 访问密钥管理（Access Keys）✅

- `GET /api/permission-groups/:groupId/keys` — 列出权限组的所有密钥 ✅
- `POST /api/permission-groups/:groupId/keys` — 生成新密钥 ✅
  - 请求体: `{ description?, expires_at?: timestamp }` ✅
  - 响应: **仅在创建时返回完整密钥明文**，之后无法再次获取 ✅
- `PATCH /api/access-keys/:id` — 更新密钥（修改备注、到期时间）✅
- `POST /api/access-keys/:id/revoke` — 撤销密钥（设置 is_active=false）✅
- `DELETE /api/access-keys/:id` — 永久删除密钥 ✅

### 6.5 管理员接口（Admin Only）✅

#### 用户管理 ✅

- `GET /api/admin/users` — 列出所有用户（分页）✅
- `POST /api/admin/users/:id/activate` — 激活用户 ✅
- `POST /api/admin/users/:id/deactivate` — 停用用户 ✅
- `DELETE /api/admin/users/:id` — 删除用户 ✅

#### 端点审查（安全审计）✅

- `GET /api/admin/users/:userId/endpoints` — 查看指定用户的完整端点树 ✅
- `GET /api/admin/endpoints/:id` — 查看任意端点的详细内容和配置 ✅
- `POST /api/admin/endpoints/:id/force-unpublish` — 强制下线端点 ✅

#### 系统统计 ✅

- `GET /api/admin/stats` — 系统统计（用户数、端点数、请求量等）✅

### 6.6 公开端点访问（Execution Layer）⚠️

- `GET|POST|PUT|DELETE /e/:username/:path/*` — 访问用户发布的端点 ✅

  **⚠️ 鉴权方式差异**：
  - **设计文档**：`Authorization: Bearer <access_key>` 或 `?token=<access_key>`
  - **实际实现**：
    - HTTP Header: `X-Access-Key: <access_key>`
    - Query 参数: `?access_key=<access_key>`

  **端点类型支持**：
  - ✅ **static** - 返回静态内容（支持自定义 Content-Type 和响应头）
  - ✅ **proxy** - 转发请求到目标 URL（支持超时、自定义请求头、移除指定头）
  - ❌ **script** - 返回 `501 Not Implemented`（Phase 3 未实现）

  **访问控制验证流程**：
  1. ✅ 用户存在性检查
  2. ✅ 用户激活状态检查
  3. ✅ 端点存在性检查
  4. ✅ 端点发布状态检查
  5. ✅ 端点启用状态检查
  6. ✅ 访问权限验证（如需鉴权）：
     - 权限组配置检查
     - 密钥有效性验证（明文比较）
     - 密钥过期时间检查
     - 密钥激活状态检查
  7. ✅ 密钥使用统计更新（lastUsedAt、usageCount）

  **缺失功能**：
  - ❌ 访问日志记录（accessLogs 表未实现）
  - ❌ 请求速率限制
  - ❌ 地理位置信息记录

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

### 7.1 认证与密钥管理 ⚠️

**会话管理** ✅：

- GitHub OAuth 2.0 授权码流程
- 会话令牌：cuid2 生成，30天有效期
- 认证方式：`Authorization: Bearer {sessionToken}`
- 自动过期：中间件检查 `expiresAt > now()`
- CSRF 防护：OAuth state 参数验证

**密钥存储策略** ⚠️：

- **Platform API Key**（用户管理密钥）：
  - ✅ 格式：`sec-{64位十六进制}`
  - ✅ 存储：PBKDF2 哈希（100,000 次迭代，SHA-256）
  - ✅ 生成函数：`generateUserApiKey()` in `src/utils/encryption.ts`
- **Endpoint Access Key**（端点访问密钥）：
  - ⚠️ 格式：`ep-{32位十六进制}`
  - ⚠️ 存储：**明文存储**（与设计文档不同）
  - ⚠️ 验证：直接字符串比较
  - 原因：简化验证逻辑，避免哈希计算开销
  - 影响：降低安全性，但适合非敏感场景
  - 备注：`hashAccessKey()` 函数已实现但未使用

### 7.2 权限控制 ✅

```typescript
// 认证中间件
app.use("/api/*", authMiddleware); ✅
// 激活检查（仅限发布端点）
app.use("/api/endpoints/*/publish", activationMiddleware); ✅
// 管理员权限
app.use("/api/admin/*", adminMiddleware); ✅
```

### 7.3 数据加密与环境变量 ✅

**环境变量管理** ✅：

- **实现方式**：使用 Cloudflare Workers 原生环境变量系统
- **配置方式**：
  - 本地开发：`.dev.vars` 文件（已加入 .gitignore）
  - 生产环境：Cloudflare Dashboard 或 `wrangler.jsonc` 配置
- **必需变量**：
  - `GITHUB_CLIENT_ID`：GitHub OAuth 应用 ID
  - `GITHUB_CLIENT_SECRET`：GitHub OAuth 应用密钥
  - `APP_BASE_URL`：应用基础 URL（用于 OAuth 回调）
  - `NODE_ENV`：环境标识（development/production）
  - `VITE_PORT`：Vite 开发服务器端口（默认 5173）
- **优势**：
  - 无需在应用层实现 envVars 表
  - 无需实现加密存储逻辑
  - 降低安全风险，简化架构
  - 利用 Cloudflare 平台级安全保障

**OAuth Token 处理** ✅：

- GitHub access_token 仅在登录时使用，不持久化存储
- 使用会话令牌（sessionToken）进行后续认证
- 会话过期后需重新登录获取新 token

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

## 10. 开发任务清单与实现状态

**当前项目阶段**：Phase 2 已完成，Phase 3 未开始

**完成度概览**：

- **Phase 1（MVP）**：95% 完成 ✅
- **Phase 2（权限组）**：100% 完成 ✅
- **Phase 3（脚本端点）**：0% 完成 ❌

### Phase 1 — MVP（基础功能）✅ 95% 完成

#### 后端 ✅ 100% 完成

- [x] 数据库 Schema（users, endpoints, userSessions）
- [x] GitHub OAuth 认证流程
- [x] 端点 CRUD API（静态、代理）
- [x] 端点执行层（`/e/:username/:path`）
- [x] 管理员激活用户 API

#### 前端 ⚠️ 90% 完成

- [x] OAuth 登录/回调页面
- [x] 树形端点编辑器（TreeView + Monaco Editor）
- [x] 静态端点编辑器
- [x] 代理端点配置表单
- [x] 用户设置页面（Dashboard）
- [x] 管理员用户列表
- [ ] 环境变量管理页面（依赖 Phase 3）

### Phase 2 — 权限组系统 ✅ 100% 完成

#### 后端 ✅ 100% 完成

- [x] 权限组/访问密钥表结构
- [x] 平台 API Key 管理（regenerate API）
- [x] 权限组 CRUD API
- [x] 访问密钥生成/撤销 API
- [x] 端点鉴权逻辑

#### 前端 ✅ 100% 完成

- [x] 权限组管理界面
- [x] 访问密钥列表（显示/隐藏、复制、编辑、删除）
- [x] 端点权限组选择器
- [x] 访问密钥选择对话框（复制鉴权地址）

### Phase 3 — 脚本端点（可选）❌ 0% 完成

#### 后端 ❌ 未开始

- [ ] 沙箱隔离实现
- [ ] 脚本端点执行引擎
- [ ] 脚本运行时环境（使用 Cloudflare Workers 原生能力）

#### 前端 ❌ 未开始

- [ ] 脚本端点编辑器（Monaco Editor + TypeScript 支持）
- [ ] 脚本测试/调试功能

### 额外完成的功能（超出设计）✨

#### 1. 初始化系统可视化 ✅

- **页面路由**：`/init`
- **功能**：
  - 检查系统是否已有管理员
  - 显示所有已登录用户列表
  - 可视化选择首个管理员
  - 自动激活选中用户
- **API 端点**：
  - `GET /api/init/check` - 检查初始化状态
  - `GET /api/init/users` - 获取用户列表
  - `POST /api/init/set-admin` - 设置管理员
- **安全机制**：已有管理员后自动禁用访问

#### 2. 路径树虚拟节点 ✅

- **功能**：基于端点路径自动构建类似 IDE 的文件树结构
- **实现**：`src/utils/pathTree.ts` 中的 `buildPathTree()` 函数
- **特性**：
  - 虚拟目录节点（isVirtual: true）
  - 支持多层级路径（如 `/api/v1/users`）
  - 自动按字母顺序排序
- **用户体验**：类似 VSCode 的文件浏览器

#### 3. 密钥编辑功能增强 ✅

- **快捷到期时间预设**：
  - 1天、7天、15天、30天
  - 90天、180天、365天、730天（2年）
  - 永久（null）
- **延期功能**：
  - 7天、30天、90天、180天、365天
  - 基于当前到期时间或当前时间延期
- **编辑对话框**：
  - 修改备注
  - 修改到期时间
  - 启用/禁用密钥

#### 4. 密钥显示/隐藏切换 ✅

- **功能**：点击眼睛图标切换密钥显示状态
- **隐藏格式**：`ep-abc***def` (保留前6位和后4位)
- **实现**：`maskKey()` 函数

#### 5. 端点地址复制功能 ✅

- **功能**：一键复制端点访问地址
- **支持场景**：
  - 公开端点：直接复制 `/e/{username}/{path}`
  - 鉴权端点：选择密钥后复制带密钥的 URL
- **密钥选择对话框**：
  - 显示所有可用密钥
  - 显示密钥备注和到期时间
  - 支持搜索和筛选

#### 6. Monaco Editor 集成 ✅

- **依赖**：`@monaco-editor/react`
- **用途**：静态端点内容编辑
- **特性**：
  - 语法高亮
  - 代码折叠
  - 自动补全
  - 支持多种语言（JSON、YAML、Markdown 等）

### 待完成功能（优先级排序）

#### 高优先级

1. **访问日志系统**（监控必备）
   - [ ] accessLogs 表结构
   - [ ] 访问日志记录中间件
   - [ ] 日志统计 API
   - [ ] 访问统计前端页面

2. **Platform API Key 管理完善**
   - [ ] 撤销 API（DELETE /api/user/api-key）
   - [ ] 查看信息 API（GET /api/user/api-key/info）

#### 中优先级

3. **端点测试/预览功能**
   - [ ] 编辑器中集成测试按钮
   - [ ] 模拟请求并显示响应

#### 低优先级

4. **脚本端点系统**（Phase 3 核心）
   - [ ] 沙箱隔离研究
   - [ ] 执行引擎实现
   - [ ] TypeScript 编辑器集成

---

**最后更新**: 2025-11-07（实现状态对齐）
