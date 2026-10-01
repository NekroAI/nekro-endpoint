import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import unocss from "unocss/vite";
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
    plugins: [react(), unocss(), tailwindcss()],
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
      },
    },

    resolve: {
      alias: {
        "@frontend": resolve(__dirname, "src"),
        "@": resolve(__dirname, "src"),
      },
    },

    ssr: {
      noExternal: [
        "react-router-dom",
        "@mui/material",
        "@mui/system",
        "@mui/icons-material",
        "@emotion/react",
        "@emotion/styled",
        "react-i18next",
        "i18next",
        "radix-ui",
        /^@radix-ui\//,
        "motion",
        "sonner",
        "cmdk",
        "lucide-react",
      ],
    },
  };
});
