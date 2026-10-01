import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 正确加载环境变量 - 从项目根目录加载
  const env = loadEnv(mode, resolve(__dirname, ".."), "");

  // 配置变量
  const DEV_PORT = parseInt(env.VITE_PORT || "5173");
  const API_PORT = env.VITE_API_PORT || "8787";
  const API_HOST = env.VITE_API_HOST || "localhost";

  console.log(`🚀 Frontend dev server will run on port: ${DEV_PORT}`);
  console.log(`📡 API proxy target: http://${API_HOST}:${API_PORT}`);

  return {
    root: "frontend",
    plugins: [react(), tailwindcss()],
    build: {
      outDir: "../dist/client",
      manifest: true,
    },

    // 开发服务器配置
    server: {
      port: DEV_PORT,
      host: true, // 允许外部访问
      proxy: {
        // 代理 API 请求到后端服务器
        "/api": {
          target: `http://${API_HOST}:${API_PORT}`,
          changeOrigin: true,
          secure: false,
        },
        // MCP server (src/routes/mcp.ts), so the URL shown in settings works in dev too.
        "/mcp": {
          target: `http://${API_HOST}:${API_PORT}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    resolve: {
      alias: {
        "@frontend": resolve(__dirname, "src"),
        "@": resolve(__dirname, "src"),
      },
    },

    ssr: {
      // Bundle the React UI libraries into the SSR build so they run in workerd.
      noExternal: ["react-router-dom", "radix-ui", /^@radix-ui\//, "motion", "sonner", "cmdk", "lucide-react"],
    },
  };
});
