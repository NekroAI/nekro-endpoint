export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  NODE_ENV: "development" | "production" | "test";
  VITE_PORT: string;
  // GitHub OAuth 配置
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  // 应用基础 URL
  APP_BASE_URL: string;
  // Signal Line：加密用户模型 API Key 的密钥（wrangler secret；未设置时 AI 功能关闭）
  AI_CONFIG_SECRET?: string;
};
