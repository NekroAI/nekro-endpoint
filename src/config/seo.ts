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

  // 品牌色彩
  themeColor: string;

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
  siteName: "NekroEdge",
  siteUrl: "https://edge.nekro.ai",
  title: "NekroEdge - 现代化全栈应用模板",
  description:
    "基于 Cloudflare 技术栈的生产级全栈应用模板，使用 Hono + React + D1 技术栈，提供开箱即用的开发体验和端到端类型安全。支持服务器端渲染、自动API文档生成。",
  keywords: [
    "全栈开发",
    "Cloudflare",
    "Hono",
    "React",
    "TypeScript",
    "无服务器",
    "边缘计算",
    "D1数据库",
    "SSR",
    "开发模板",
  ],
  author: "NekroEdge Team",
  language: "zh-CN",

  // 🎨 社交媒体和品牌
  ogImage: "/og-image.png",
  themeColor: "#8A2BE2",

  // 📄 页面级配置
  pages: {
    "/": {
      title: "NekroEdge - 现代化全栈应用模板 | Cloudflare + Hono + React",
      changefreq: "weekly",
      priority: 1.0,
    },
    "/features": {
      title: "功能演示 - NekroEdge 全栈模板",
      description: "体验 NekroEdge 模板的核心功能：端到端类型安全、服务器端渲染、自动API文档生成等现代化开发特性。",
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
