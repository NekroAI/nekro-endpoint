import { Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import { WorkspaceLayout } from "./layouts/WorkspaceLayout";
import HomePage from "./pages/HomePage";
import { Features } from "./pages/Features";
import { DashboardPage } from "./pages/DashboardPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { InitPage } from "./pages/InitPage";
import { DocsPage } from "./pages/DocsPage";
import { AppShell } from "./app/AppShell";
import { Placeholder } from "./app/Placeholder";
import { EndpointsPage as SignalEndpointsPage } from "./features/endpoints/EndpointsPage";
import { AccessPage } from "./features/access/AccessPage";
import { SettingsPage } from "./features/settings/SettingsPage";

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

    {/* Signal 工作区（docs/REDESIGN.md §4） */}
    <Route path="/app" element={<AppShell />}>
      <Route index element={<Navigate to="endpoints" replace />} />
      <Route path="endpoints/*" element={<SignalEndpointsPage />} />
      <Route path="access" element={<AccessPage />} />
      <Route path="access/:groupId" element={<AccessPage />} />
      <Route path="overview" element={<Placeholder title="概览" />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="admin" element={<Placeholder title="管理" />} />
    </Route>

    {/* 旧版工作区布局（迁移完成后改为重定向） */}
    <Route element={<WorkspaceLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/endpoints" element={<Navigate to="/app/endpoints" replace />} />
      <Route path="/permissions" element={<Navigate to="/app/access" replace />} />
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
