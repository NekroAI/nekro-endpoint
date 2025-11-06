# NekroEndpoint

> 🌐 **在边缘构建你的 API 端点 - 端点编排平台**

[![部署状态](https://img.shields.io/badge/部署-在线-brightgreen)](https://ep.nekro.ai/) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

NekroEndpoint 是一个基于 Cloudflare Workers 构建的端点编排平台，支持静态内容返回、代理转发、动态脚本执行。为技术用户提供灵活的端点管理和权限控制能力。

## 🌟 在线演示

体验 NekroEndpoint 平台：**[https://ep.nekro.ai/](https://ep.nekro.ai/)**

## ✨ 核心功能

- 📡 **多种端点类型**: Static（静态内容）/ Proxy（代理转发）/ Script（动态脚本执行）
- 🔐 **权限控制**: 创建权限组，生成访问密钥，实现细粒度访问控制
- 🌲 **树形结构**: 层级化管理你的端点，基于路径自动构建目录树
- ⚡ **全球加速**: 基于 Cloudflare Workers，在全球 300+ 节点提供极速响应
- 🔑 **二次分发**: 为每个端点配置独立的访问密钥，支持增值服务
- 🎨 **现代界面**: Material-UI 构建的美观界面，支持亮/暗模式
- 📊 **管理后台**: 完整的用户管理和端点审查功能（管理员）
- 🚀 **零冷启动**: Cloudflare Workers 提供即时响应能力
- 🎯 **智能初始化**: 首次部署时访问初始化页面完成管理员分配，无需手动 SQL

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/NekroAI/nekro-endpoint.git
cd nekro-endpoint
pnpm install
```

### 2. 配置环境变量

1. 在 [GitHub Settings](https://github.com/settings/developers) 创建 OAuth App
   - Application name: NekroEndpoint Platform
   - Homepage URL: `http://localhost:8787`
   - Authorization callback URL: `http://localhost:8787/auth/callback`

2. 复制 `.dev.vars.example` 为 `.dev.vars` 并填入你的 GitHub OAuth 凭证：
   ```bash
   cp .dev.vars.example .dev.vars
   # 编辑 .dev.vars，填入 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET
   ```

### 3. 初始化数据库

```bash
pnpm db:migrate
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:8787 开始使用！

### 5. 系统初始化（首次部署）

首次部署后，需要手动访问初始化页面完成管理员分配：

1. **访问初始化页面**：手动访问 `http://localhost:8787/init`（或生产环境的 `/init` 路径）
2. **检查状态**：页面会自动检查系统是否需要初始化（是否有管理员）
3. **注册用户**：如果用户列表为空，点击"使用 GitHub 登录注册"按钮完成注册
4. **分配管理员**：从用户列表中选择一个用户，点击"设置为管理员"
5. **完成初始化**：系统会自动将该用户设置为管理员并激活，3秒后跳转到首页

> **提示**：
>
> - 初始化完成后，系统将不再允许访问初始化接口，确保安全性
> - 只有手动访问 `/init` 页面时才会执行初始化检查，不会影响其他页面的性能

## 🎯 使用流程

### 首次部署（管理员）

1. **系统初始化**: 手动访问 `/init` 页面完成初始化
   - 页面会自动检查系统是否需要初始化（是否有管理员）
   - 如果用户列表为空，使用 GitHub 登录注册第一个用户
   - 从用户列表中选择一个用户设置为管理员
   - 系统会自动激活该管理员账号

### 普通用户流程

1. **注册账号**: 使用 GitHub 账号登录
2. **创建端点**: 在端点管理页面创建和编辑你的端点
3. **配置权限**: 创建权限组，生成访问密钥（可选）
4. **申请激活**: 联系管理员激活你的账号（未激活用户可以使用所有功能，但无法发布端点）
5. **发布端点**: 账号激活后，发布端点即可通过 `/e/:username/:path` 访问

> **注意**: 未激活用户可以正常创建、编辑端点和管理权限组，只是无法**发布**端点。这样可以让你先完成所有配置，激活后即可立即发布。

### 手动设置管理员（可选）

如果需要在数据库中手动设置管理员：

```sql
-- 在数据库中执行
UPDATE users SET role = 'admin', is_activated = 1 WHERE github_id = 'your_github_id';
```

或者使用系统初始化页面（推荐）：访问 `/init` 页面进行可视化配置。

## 📚 完整文档

### 🛠️ 开发指南

- [📋 安装配置指南](./docs/INSTALLATION.md) - 详细的环境搭建和配置
- [🔐 认证配置指南](./docs/AUTHENTICATION.md) - GitHub OAuth 登录集成
- [⚙️ 开发指南](./docs/DEVELOPMENT.md) - 日常开发工作流和最佳实践
- [🎨 主题定制指南](./docs/THEMING.md) - 自定义应用外观和主题
- [🔌 API 开发指南](./docs/API_GUIDE.md) - 创建和管理后端 API

### 🚀 部署运维

- [📦 部署指南](./docs/DEPLOYMENT.md) - Cloudflare Pages 部署完整流程

### 📖 深度了解

- [🏛️ 项目架构](./docs/ARCHITECTURE.md) - 技术栈和设计决策
- [🔍 SEO 配置指南](./docs/SEO_GUIDE.md) - 搜索引擎优化配置

## 🎯 适合谁使用

- ✅ 想在 Cloudflare 生态快速构建应用的开发者
- ✅ 需要类型安全和现代开发体验的团队
- ✅ 寻找生产级全栈模板的项目
- ✅ 喜欢无服务器架构的技术栈

## 🤝 社区支持

- 🐛 [报告问题](https://github.com/NekroAI/nekro-endpoint/issues)
- 💬 [讨论区](https://github.com/NekroAI/nekro-endpoint/discussions)
- ⭐ 觉得有用请给个 Star！

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

**开始构建你的下一个伟大应用吧！** 🚀
