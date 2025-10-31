# 🎯 SEO 配置指南

> **一分钟配置，全站 SEO 优化完成！**

本模板提供了**集中化、类型安全**的 SEO 配置系统，您只需要修改一个文件即可完成整站的 SEO 设置。

## 📖 快速开始

### 1. 修改 SEO 配置

打开 `src/config/seo.ts` 文件，根据您的项目信息修改配置：

```typescript
export const seoConfig: SEOConfig = {
  // 🌟 基础网站信息（必须修改）
  siteName: "Your App Name",
  siteUrl: "https://your-domain.com",
  title: "Your App - 简短描述",
  description: "详细描述您的应用功能和特色...",
  keywords: ["关键词1", "关键词2", "关键词3"],
  author: "Your Team Name",
  language: "zh-CN", // 或 "en-US"

  // 🎨 社交媒体和品牌
  ogImage: "/og-image.png", // 1200x630 像素
  twitterHandle: "your_twitter", // 可选
  themeColor: "#your-brand-color",

  // 📄 页面级配置
  pages: {
    "/": {
      title: "首页标题 - 品牌名",
      changefreq: "weekly",
      priority: 1.0,
    },
    "/about": {
      title: "关于我们 - 品牌名",
      description: "关于页面的描述...",
      changefreq: "monthly",
      priority: 0.8,
    },
  },
};
```

### 2. 生成 HTML 模板

修改配置后，运行以下命令更新 HTML 模板：

```bash
pnpm generate:html
```

### 3. 部署

```bash
pnpm deploy
```

就这么简单！🎉

## 🔧 高级配置

### 页面级别的 SEO 设置

每个页面可以有独立的 SEO 配置：

```typescript
pages: {
  "/products": {
    title: "产品列表 - 我的商城",
    description: "查看我们的全部产品，包括...",
    keywords: ["产品", "商城", "购买"],
    changefreq: "daily",
    priority: 0.9,
  },
  "/blog": {
    title: "博客 - 我的网站",
    description: "最新的技术文章和行业资讯",
    changefreq: "weekly",
    priority: 0.7,
  }
}
```

### 动态页面的 SEO（高级）

如果您需要为动态路由设置 SEO，可以在渲染时动态生成：

```typescript
// 在您的路由组件中
import { generatePageTitle, generatePageDescription } from "@/config/seo";

// 动态设置页面标题
document.title = generatePageTitle(`/blog/${postId}`);
```

## 📊 自动生成的功能

配置完成后，系统会自动为您生成：

### ✅ Meta 标签

- 完整的 SEO meta 标签
- Open Graph 标签（Facebook、LinkedIn 分享）
- Twitter Card 标签
- 结构化数据（JSON-LD）

### ✅ 搜索引擎优化

- 自动生成 `robots.txt`
- 自动生成 `sitemap.xml`
- 规范化 URL（canonical）

### ✅ 社交媒体优化

- 分享卡片预览
- 品牌一致性
- 移动端优化

## 🎨 社交媒体图片

创建一张 **1200x630 像素**的图片，命名为 `og-image.png`，放在 `frontend/public/` 目录下。

**图片内容建议：**

- 您的 Logo
- 应用名称
- 简短的标语
- 品牌色彩

## 🔍 SEO 检查清单

部署后，使用以下工具验证 SEO 效果：

### 必做检查

- [ ] **Google Rich Results Test**: https://search.google.com/test/rich-results
- [ ] **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
- [ ] **Twitter Card Validator**: https://cards-dev.twitter.com/validator

### 可选检查

- [ ] 访问 `your-domain.com/robots.txt`
- [ ] 访问 `your-domain.com/sitemap.xml`
- [ ] 在不同设备上测试分享效果

## 📈 最佳实践

### 标题优化

```typescript
// ✅ 好的标题格式
title: "具体功能 - 品牌名 | 核心价值";

// ❌ 避免
title: "欢迎来到我们的网站";
```

### 描述优化

```typescript
// ✅ 好的描述
description: "使用我们的工具可以帮您快速完成 X 任务，支持 Y 功能，已有 10000+ 用户选择。";

// ❌ 避免
description: "这是一个很棒的网站";
```

### 关键词选择

```typescript
// ✅ 精准相关的关键词
keywords: ["任务管理", "团队协作", "项目管理工具", "在线办公"];

// ❌ 避免堆砌
keywords: ["好用", "强大", "完美", "最佳"];
```

## 🚀 模板架构优势

### 🎯 集中化配置

- **单一数据源**：所有 SEO 配置在一个文件中
- **类型安全**：TypeScript 确保配置正确性
- **零重复**：HTML 模板统一生成，避免重复代码

### 🔄 自动化流程

- **构建时生成**：HTML 模板在构建时自动更新
- **动态内容**：robots.txt 和 sitemap.xml 实时生成
- **缓存优化**：SEO 文件包含合理的缓存策略

### 🎨 开发友好

- **即时更新**：修改配置后立即生效
- **文档完整**：每个配置项都有清晰说明
- **易于扩展**：可轻松添加新页面的 SEO 配置

## 🤔 常见问题

### Q: 如何为新页面添加 SEO 配置？

A: 在 `seoConfig.pages` 中添加对应路径的配置即可。

### Q: 修改配置后需要重新部署吗？

A: 是的，需要运行 `pnpm generate:html && pnpm deploy`。

### Q: 如何测试 SEO 效果？

A: 使用文档中提到的在线工具，或在社交媒体平台测试分享效果。

### Q: 可以为不同语言设置不同的 SEO 吗？

A: 目前单语言支持，多语言 SEO 需要额外的配置。

---

**🎉 现在您的网站已经具备了企业级的 SEO 配置！**
