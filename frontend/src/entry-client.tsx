import "vite/modulepreload-polyfill";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as OriginalBrowserRouter } from "react-router-dom";
import "./styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppThemeProvider } from "./context/ThemeContextProvider";
import { AppRoutes } from "./routes";
import { SignalProviders } from "./app/providers";

// CJS/ESM interop fix for react-router-dom
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BrowserRouter = (OriginalBrowserRouter as any).default ?? OriginalBrowserRouter;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
});

const AppComponent = (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <BrowserRouter>
          <SignalProviders>
            <AppRoutes />
          </SignalProviders>
        </BrowserRouter>
      </AppThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

const rootElement = document.getElementById("root")!;

// 在开发环境使用 createRoot，在生产环境使用 hydrateRoot 进行 SSR
if (import.meta.env.DEV) {
  ReactDOM.createRoot(rootElement).render(AppComponent);
} else {
  ReactDOM.hydrateRoot(rootElement, AppComponent);
}
