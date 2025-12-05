import { Route, Routes } from "react-router-dom";
import App from "./App";
import { WorkspaceLayout } from "./layouts/WorkspaceLayout";
import HomePage from "./pages/HomePage";
import { Features } from "./pages/Features";
import { DashboardPage } from "./pages/DashboardPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { EndpointsPage } from "./pages/EndpointsPage";
import { PermissionGroupsPage } from "./pages/PermissionGroupsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { InitPage } from "./pages/InitPage";
import { DocsPage } from "./pages/DocsPage";

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
    {/* 初始化页面（不需要布局） */}
    <Route path="/init" element={<InitPage />} />

    {/* 工作区布局（专业工具页面） */}
    <Route element={<WorkspaceLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/endpoints" element={<EndpointsPage />} />
      <Route path="/permissions" element={<PermissionGroupsPage />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />
    </Route>

    {/* 标准网页布局 */}
    <Route path="/" element={<App />}>
      <Route index element={<HomePage />} />
      <Route path="docs" element={<DocsPage />} />
      <Route path="features" element={<Features />} />
      <Route path="auth/callback" element={<AuthCallbackPage />} />
      {/* 在这里添加新的路由 */}
    </Route>
  </Routes>
);
