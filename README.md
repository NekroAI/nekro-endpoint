# NekroEdge

> 🚀 **一个基于 Cloudflare 技术栈的现代化全栈应用模板**

[![部署状态](https://img.shields.io/badge/部署-在线-brightgreen)](https://edge.nekro.ai/) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

这是一个基于 Cloudflare Pages & Workers 构建的**生产级**全栈应用模板，使用 **Hono + React + D1** 技术栈，提供开箱即用的开发体验和端到端类型安全。

## 🌟 在线演示

体验模板基础功能：**[https://edge.nekro.ai/](https://edge.nekro.ai/)**

## ✨ 核心特性

- 🏗️ **全栈框架**: Hono + React - 在 Cloudflare Workers 上的完整解决方案
- ⚡ **现代开发**: Vite + TypeScript - 闪电般的开发体验
- 🔐 **用户认证**: GitHub OAuth 登录集成
- 🎨 **UI 组件**: Material-UI + UnoCSS - 完整的设计系统
- 🗄️ **数据库**: Cloudflare D1 + Drizzle ORM - 类型安全的无服务器数据库
- 🌙 **主题系统**: 内置亮/暗模式切换
- 📖 **自动文档**: 集成 Swagger UI
- 🚀 **一键部署**: 完整的 Cloudflare Pages 配置

## 🚀 5分钟快速开始

### 1. 创建项目

```bash
git clone https://github.com/NekroAI/nekro-edge-template.git your-project-name
cd your-project-name
pnpm install
```

### 2. 配置 GitHub OAuth（可选）

如果需要使用登录功能，请配置 GitHub OAuth：

1. 在 [GitHub Settings](https://github.com/settings/applications/new) 创建 OAuth App
2. 复制 `.env.example` 为 `.dev.vars` 并填入你的凭证

详细配置请参考 [认证配置指南](./docs/AUTHENTICATION.md)

### 3. 启动开发

```bash
pnpm dev
```

### 4. 访问应用

- 🔥 **前端开发**: http://localhost:5173 (推荐，支持热重载)
- 🔗 **完整应用**: http://localhost:8787
- 📚 **API 文档**: http://localhost:8787/api/doc

🎉 **就这么简单！** 开始构建你的应用吧！

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

- 🐛 [报告问题](https://github.com/NekroAI/nekro-edge-template/issues)
- 💬 [讨论区](https://github.com/NekroAI/nekro-edge-template/discussions)
- ⭐ 觉得有用请给个 Star！

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

**开始构建你的下一个伟大应用吧！** 🚀
