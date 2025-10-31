# 认证配置指南

本指南将详细介绍如何在 NekroEdge 模板中配置和使用 GitHub OAuth 登录功能。

## 目录

- [快速开始](#快速开始)
- [GitHub OAuth 应用创建](#github-oauth-应用创建)
- [环境变量配置](#环境变量配置)
- [认证流程详解](#认证流程详解)
- [API Key 管理](#api-key-管理)
- [安全最佳实践](#安全最佳实践)

## 快速开始

### 1. 创建 GitHub OAuth 应用

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写应用信息：

**本地开发环境：**

```
Application name: NekroEdge Template (Local)
Homepage URL: http://localhost:8787
Authorization callback URL: http://localhost:8787/auth/callback
```

**生产环境：**

```
Application name: NekroEdge Template
Homepage URL: https://your-domain.pages.dev
Authorization callback URL: https://your-domain.pages.dev/auth/callback
```

4. 创建后，记录 `Client ID` 和生成 `Client Secret`

### 2. 配置环境变量

复制 `env.example` 为 `.dev.vars` 并填入实际值：

```bash
cp env.example .dev.vars
```

编辑 `.dev.vars`：

```env
GITHUB_CLIENT_ID="your_github_client_id_here"
GITHUB_CLIENT_SECRET="your_github_client_secret_here"
APP_BASE_URL="http://localhost:8787"
```

### 3. 应用数据库迁移

```bash
# 生成迁移文件
pnpm db:generate

# 应用到本地数据库
pnpm db:migrate
```

### 4. 启动应用

```bash
pnpm dev
```

访问 http://localhost:8787，点击右上角的 "GitHub 登录" 按钮即可测试登录功能。

## GitHub OAuth 应用创建

### 开发环境配置

开发环境需要创建一个单独的 OAuth 应用：

1. **Application name**: 使用易于识别的名称，如 `YourApp (Local)`
2. **Homepage URL**: `http://localhost:8787`
3. **Authorization callback URL**: `http://localhost:8787/auth/callback`

⚠️ **重要**: GitHub 不允许 `localhost` 使用 HTTPS，所以开发环境必须使用 `http://`。

### 生产环境配置

生产环境使用不同的 OAuth 应用：

1. **Application name**: 应用的正式名称
2. **Homepage URL**: 生产环境域名（如 `https://your-domain.pages.dev`）
3. **Authorization callback URL**: `https://your-domain.pages.dev/auth/callback`

### 回调 URL 说明

回调 URL 必须精确匹配，包括：

- 协议（http/https）
- 域名
- 端口号（如果有）
- 路径（`/auth/callback`）

## 环境变量配置

### 本地开发（.dev.vars）

```env
GITHUB_CLIENT_ID="your_local_oauth_app_client_id"
GITHUB_CLIENT_SECRET="your_local_oauth_app_client_secret"
APP_BASE_URL="http://localhost:8787"
```

### Cloudflare Pages 生产环境

在 Cloudflare Dashboard 中配置：

1. 进入你的 Pages 项目
2. 转到 Settings → Environment variables
3. 添加以下变量（Production 环境）：

```
GITHUB_CLIENT_ID = your_production_oauth_app_client_id
GITHUB_CLIENT_SECRET = your_production_oauth_app_client_secret
```

⚠️ **注意**: `APP_BASE_URL` 已在 `wrangler.jsonc` 中配置，无需在环境变量中重复设置。

### 配置验证

启动应用后，检查日志中是否有 OAuth 配置错误。如果配置正确，登录按钮应该正常显示。

## 认证流程详解

### 完整认证流程

```
1. 用户点击 "GitHub 登录" 按钮
   ↓
2. 前端调用 /api/auth/github 获取 GitHub OAuth URL
   ↓
3. 跳转到 GitHub 授权页面
   ↓
4. 用户授权后，GitHub 重定向到 /auth/callback?code=xxx
   ↓
5. 前端调用 /api/auth/github/callback 处理回调
   ↓
6. 后端使用 code 交换 access_token
   ↓
7. 后端使用 access_token 获取用户信息
   ↓
8. 创建或更新用户记录
   ↓
9. 创建会话并返回 sessionToken
   ↓
10. 前端保存 token 到 localStorage
   ↓
11. 跳转到 /dashboard
```

### 会话管理

- **会话有效期**: 30 天
- **存储位置**: localStorage（`auth_token`键）
- **自动过期**: 中间件会验证会话是否过期
- **多标签页同步**: 使用自定义事件同步登录状态

### 受保护的路由

需要认证的端点会使用 `authMiddleware` 中间件：

```typescript
// 示例：受保护的 API 端点
protectedRoutes.use("/*", authMiddleware);
protectedRoutes.openapi(meRoute, async (c) => {
  const user = c.get("user"); // 中间件已注入用户信息
  // ...
});
```

## API Key 管理

每个用户都有一个唯一的 API Key，用于 API 认证。

### API Key 格式

```
ak-{64位十六进制字符串}
```

示例：`ak-a1b2c3d4e5f6...`

### 查看 API Key

登录后，在 Dashboard 页面可以查看当前的 API Key（部分隐藏）。

### 重新生成 API Key

1. 进入 Dashboard
2. 点击 "重新生成" 按钮
3. 确认操作（⚠️ 旧 Key 将立即失效）
4. 复制新的 API Key

### 使用 API Key

在 API 请求中添加 Authorization 头：

```bash
curl -H "Authorization: Bearer ak-your-api-key-here" \
  https://your-domain.pages.dev/api/your-endpoint
```

### API Key 安全提示

- ✅ **定期轮换**: 建议定期重新生成 API Key
- ✅ **安全存储**: 不要在前端代码或公开仓库中硬编码 API Key
- ✅ **环境变量**: 在应用中使用环境变量存储 API Key
- ❌ **不要分享**: 不要与他人分享你的 API Key
- ❌ **泄露处理**: 如果怀疑 Key 泄露，立即重新生成

## 安全最佳实践

### 1. OAuth 凭证保护

```bash
# ✅ 正确：使用 .dev.vars（已加入 .gitignore）
cp env.example .dev.vars
# 编辑 .dev.vars 填入真实凭证

# ❌ 错误：直接修改 env.example
# 不要将真实凭证提交到版本控制系统
```

### 2. HTTPS 强制使用

- **本地开发**: 可以使用 HTTP（GitHub 限制）
- **生产环境**: 必须使用 HTTPS（Cloudflare Pages 自动提供）

### 3. CSRF 防护

OAuth 登录流程使用 `state` 参数防止 CSRF 攻击。每次登录请求都会生成唯一的 state 值。

### 4. 会话安全

- 会话 Token 使用加密安全的随机 ID（cuid2）
- Token 存储在 HTTPOnly Cookie 或 localStorage
- 会话自动过期（30天）

### 5. 生产环境清单

部署前检查：

- [ ] 创建了生产环境专用的 GitHub OAuth 应用
- [ ] 在 Cloudflare Pages 中配置了环境变量
- [ ] 更新了 `wrangler.jsonc` 中的 `APP_BASE_URL`
- [ ] 运行了生产环境数据库迁移 (`pnpm db:migrate:prod`)
- [ ] 测试了完整的登录流程

## 故障排除

### 问题：点击登录按钮后没有反应

**可能原因**：

- GitHub OAuth 凭证未配置或配置错误
- 环境变量未正确加载

**解决方案**：

1. 检查 `.dev.vars` 文件是否存在且配置正确
2. 重启开发服务器 (`pnpm dev`)
3. 查看浏览器控制台和服务器日志

### 问题：GitHub 回调后显示错误

**可能原因**：

- 回调 URL 配置不匹配
- Client Secret 错误

**解决方案**：

1. 确认 GitHub OAuth App 的回调 URL 与实际使用的完全一致
2. 检查 Client ID 和 Client Secret 是否正确

### 问题：登录成功但刷新后需要重新登录

**可能原因**：

- LocalStorage 被清除
- 会话已过期

**解决方案**：

1. 检查浏览器是否设置了自动清除 Cookie/Storage
2. 确认会话 Token 是否正确保存

### 问题：数据库迁移失败

**可能原因**：

- 未生成迁移文件
- 数据库文件权限问题

**解决方案**：

```bash
# 重新生成并应用迁移
pnpm db:generate
pnpm db:migrate
```

## 相关文档

- [API 开发指南](./API_GUIDE.md) - 如何创建受保护的 API 端点
- [开发指南](./DEVELOPMENT.md) - 数据库操作和迁移
- [部署指南](./DEPLOYMENT.md) - 生产环境部署配置

---

**需要帮助？** 在 [GitHub Issues](https://github.com/NekroAI/nekro-edge-template/issues) 提问。
