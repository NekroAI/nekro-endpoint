import React from "react";
import ReactDOMServer from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppThemeProvider } from "./context/ThemeContextProvider";
import { AppRoutes } from "./routes";

/**
 * 服务端渲染入口
 *
 * @param path - 请求的路径
 * @returns 渲染后的 HTML 字符串和其他数据
 */
export function render(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity, // 服务端不需要重新获取数据
        gcTime: Infinity,
      },
    },
  });

  const html = ReactDOMServer.renderToString(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <StaticRouter location={path}>
            <AppRoutes />
          </StaticRouter>
        </AppThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );

  return { html };
}
