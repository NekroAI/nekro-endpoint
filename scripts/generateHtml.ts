#!/usr/bin/env tsx
/**
 * 根据SEO配置生成开发环境的HTML模板
 * 使用方法：pnpm tsx scripts/generateHtml.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { generateHtmlTemplate } from "../src/utils/htmlTemplate";

// 生成开发环境的HTML模板
function generateDevelopmentHtml() {
  const htmlContent = generateHtmlTemplate({
    path: "/",
    content: "<!--app-html-->",
    cssFiles: [],
    jsFiles: ["/src/entry-client.tsx"],
  });

  const outputPath = join(__dirname, "../frontend/index.html");
  writeFileSync(outputPath, htmlContent, "utf-8");

  console.log("✅ Generated frontend/index.html successfully!");
  console.log("📄 File location:", outputPath);
}

// 执行生成
generateDevelopmentHtml();
