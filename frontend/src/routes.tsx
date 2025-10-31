import { Route, Routes } from "react-router-dom";
import App from "./App";
import HomePage from "./pages/HomePage";
import { Features } from "./pages/Features";
import { DashboardPage } from "./pages/DashboardPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";

/**
 * 应用路由配置
 *
 * 这是唯一的路由定义文件，被客户端和服务端入口共享使用。
 * 添加新路由时，只需要在这里修改即可。
 *
 * @example
 * // 添加新页面：
 * 1. 导入页面组件：import AboutPage from "./pages/AboutPage";
 * 2. 添加路由：<Route path="about" element={<AboutPage />} />
 */
export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<App />}>
      <Route index element={<HomePage />} />
      <Route path="features" element={<Features />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="auth/callback" element={<AuthCallbackPage />} />
      {/* 在这里添加新的路由 */}
    </Route>
  </Routes>
);
