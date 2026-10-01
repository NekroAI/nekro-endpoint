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
  siteName: "Endpoints",
  siteUrl: "https://ep.nekro.ai",
  title: "Endpoints - 在边缘发布与分享你的端点",
  description:
    "在 Cloudflare 全球边缘发布静态内容与代理端点，用权限组和通行卡控制访问。开源，可自托管。",
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
  author: "NekroAI",
  language: "zh-CN",

  // 🎨 社交媒体和品牌
  ogImage: "/og-image.png",
  themeColor: "#0A0C10",
  favicon: "/favicon.svg", // SVG 格式支持自适应暗色模式

  // 📄 页面级配置
  pages: {
    "/": {
      title: "Endpoints - 在边缘发布与分享你的端点",
      changefreq: "weekly",
      priority: 1.0,
    },
    "/docs": {
      title: "使用文档 | Endpoints",
      description: "端点类型、地址匹配、通行卡访问控制、错误码与管理 API 的完整说明。",
      keywords: ["使用文档", "API 文档", "端点管理教程", "权限控制指南"],
      changefreq: "monthly",
      priority: 0.9,
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
