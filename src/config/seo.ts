/**
 * 集中化的SEO配置文件
 * 其他开发者只需要修改这一个文件即可完成所有SEO配置
 */

export interface SEOConfig {
  // 基础信息
  siteName: string;
  siteUrl: string;
  title: string;
  description: string;
  keywords: string[];
  author: string;
  language: string;

  // 社交媒体
  ogImage: string;
  twitterHandle?: string;

  // 品牌色彩与图标
  themeColor: string;
  favicon: string; // 网站图标路径（支持 SVG、PNG、ICO 等格式）

  // 页面配置
  pages: {
    [path: string]: {
      title?: string;
      description?: string;
      keywords?: string[];
      changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
      priority?: number;
    };
  };
}

/**
 * 默认SEO配置
 * 🎯 用户只需要修改这个配置对象即可完成整站SEO设置
 */
export const seoConfig: SEOConfig = {
  // 🌟 基础网站信息（必须修改）
  siteName: "NekroEndpoint",
  siteUrl: "https://ep.nekro.ai",
  title: "NekroEndpoint - 端点编排平台",
  description:
    "基于 Cloudflare Workers 构建的端点编排平台，支持静态内容返回、代理转发、动态脚本执行。为技术用户提供灵活的端点管理和权限控制能力。",
  keywords: [
    "端点编排",
    "Cloudflare",
    "API端点",
    "端点管理",
    "权限控制",
    "无服务器",
    "边缘计算",
    "Workers",
    "端点平台",
    "API管理",
  ],
  author: "NekroEndpoint Team",
  language: "zh-CN",

  // 🎨 社交媒体和品牌
  ogImage: "/og-image.png",
  themeColor: "#8A2BE2",
  favicon: "/favicon.svg", // SVG 格式支持自适应暗色模式

  // 📄 页面级配置
  pages: {
    "/": {
      title: "NekroEndpoint - 端点编排平台 | Cloudflare + Hono + React",
      changefreq: "weekly",
      priority: 1.0,
    },
    "/docs": {
      title: "使用文档 - NekroEndpoint 平台",
      description: "了解 NekroEndpoint 平台的核心功能和使用方法，包括端点类型、权限控制、访问方式等详细说明。",
      keywords: ["使用文档", "API 文档", "端点管理教程", "权限控制指南"],
      changefreq: "monthly",
      priority: 0.9,
    },
    "/features": {
      title: "功能演示 - NekroEndpoint 平台",
      description: "体验 NekroEndpoint 平台的核心功能：端点管理、权限控制、树形结构等现代化端点编排特性。",
      changefreq: "monthly",
      priority: 0.8,
    },
  },
};

/**
 * 生成页面的完整标题
 */
export function generatePageTitle(path: string): string {
  const pageConfig = seoConfig.pages[path];
  return pageConfig?.title || `${seoConfig.title} | ${seoConfig.siteName}`;
}

/**
 * 生成页面描述
 */
export function generatePageDescription(path: string): string {
  const pageConfig = seoConfig.pages[path];
  return pageConfig?.description || seoConfig.description;
}

/**
 * 生成页面关键词
 */
export function generatePageKeywords(path: string): string {
  const pageConfig = seoConfig.pages[path];
  const keywords = pageConfig?.keywords || seoConfig.keywords;
  return keywords.join(",");
}

/**
 * 生成完整的页面URL
 */
export function generatePageUrl(path: string): string {
  return `${seoConfig.siteUrl}${path === "/" ? "" : path}`;
}
