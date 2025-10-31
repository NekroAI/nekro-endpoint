import {
  seoConfig,
  generatePageTitle,
  generatePageDescription,
  generatePageKeywords,
  generatePageUrl,
} from "../config/seo";

/**
 * 生成完整的HTML页面模板
 * 统一的HTML生成逻辑，避免重复代码
 */
export function generateHtmlTemplate(options: {
  path: string;
  content: string;
  cssFiles?: string[];
  jsFiles?: string[];
}): string {
  const { path, content, cssFiles = [], jsFiles = [] } = options;

  const title = generatePageTitle(path);
  const description = generatePageDescription(path);
  const keywords = generatePageKeywords(path);
  const url = generatePageUrl(path);

  return `<!DOCTYPE html>
<html lang="${seoConfig.language.replace("_", "-")}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO Meta Tags -->
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
    <meta name="author" content="${seoConfig.author}">
    <meta name="robots" content="index, follow">
    <meta name="language" content="${seoConfig.language}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${seoConfig.siteUrl}${seoConfig.ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="${seoConfig.siteName}">
    <meta property="og:locale" content="${seoConfig.language}">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${url}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${seoConfig.siteUrl}${seoConfig.ogImage}">
    ${seoConfig.twitterHandle ? `<meta name="twitter:site" content="@${seoConfig.twitterHandle}">` : ""}
    
    <!-- Additional SEO -->
    <link rel="canonical" href="${url}">
    <meta name="theme-color" content="${seoConfig.themeColor}">
    <meta name="application-name" content="${seoConfig.siteName}">
    <meta name="apple-mobile-web-app-title" content="${seoConfig.siteName}">
    <meta name="msapplication-TileColor" content="${seoConfig.themeColor}">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "${seoConfig.siteName}",
      "description": "${seoConfig.description}",
      "url": "${seoConfig.siteUrl}",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "${seoConfig.siteUrl}/search?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
    </script>
    
    <!-- Favicon -->
    <link rel="icon" href="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3e%3cdefs%3e%3clinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3e%3cstop offset='0%25' stop-color='%238A2BE2'/%3e%3cstop offset='100%25' stop-color='%234A90E2'/%3e%3c/linearGradient%3e%3clinearGradient id='b' x1='0' y1='0' x2='1' y2='1'%3e%3cstop offset='0%25' stop-color='%2350E3C2'/%3e%3cstop offset='100%25' stop-color='%234A90E2'/%3e%3c/linearGradient%3e%3c/defs%3e%3cpath d='M32 4L54 18V46L32 60L10 46V18L32 4Z' fill='url(%23a)'/%3e%3cpath d='M10 32 C 14 16, 50 16, 54 32 C 50 22, 14 22, 10 32 Z' fill='url(%23b)'/%3e%3c/svg%3e">
    
    <!-- Stylesheets -->
    ${cssFiles.map((css) => `<link rel="stylesheet" crossorigin href="${css}">`).join("\n    ")}
  </head>
  <body>
    <div id="root">${content}</div>
    
    <!-- Scripts -->
    ${jsFiles.map((js) => `<script type="module" crossorigin src="${js}"></script>`).join("\n    ")}
  </body>
</html>`;
}

/**
 * 生成 robots.txt 内容
 */
export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${seoConfig.siteUrl}/sitemap.xml

# Specific rules for search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /

# Block access to admin or sensitive areas if any
Disallow: /api/
Disallow: /_worker.js
Disallow: /dist/

# Crawl delay (optional, be conservative)
Crawl-delay: 1`;
}

/**
 * 生成 sitemap.xml 内容
 */
export function generateSitemapXml(): string {
  const today = new Date().toISOString().split("T")[0];

  const urls = Object.entries(seoConfig.pages)
    .map(([path, config]) => {
      const url = generatePageUrl(path);
      const changefreq = config.changefreq || "monthly";
      const priority = config.priority || 0.5;

      return `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
        
${urls}
  
</urlset>`;
}
