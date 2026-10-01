import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import { EndpointsPage } from "./features/endpoints/EndpointsPage";
import { AccessPage } from "./features/access/AccessPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { OverviewPage } from "./features/overview/OverviewPage";
import { AdminPage } from "./features/admin/AdminPage";
import { SiteLayout } from "./features/site/SiteLayout";
import { LandingPage } from "./features/site/LandingPage";
import { DocsPage } from "./features/site/DocsPage";
import { AuthCallbackPage } from "./features/site/AuthCallbackPage";
import { InitPage } from "./features/site/InitPage";

/**
 * 应用路由配置
 *
 * 这是唯一的路由定义文件，被客户端和服务端入口共享使用。
 * 添加新路由时，只需要在这里修改即可。
 *
 * 旧路径（/dashboard、/endpoints、/permissions、/admin/users、/features）
 * 可能被书签或外部链接引用，必须保留为重定向（docs/REDESIGN.md §1.5）。
 */
export const AppRoutes = () => (
  <Routes>
    {/* 首次部署：分配管理员 */}
    <Route path="/init" element={<InitPage />} />

    {/* 工作区 */}
    <Route path="/app" element={<AppShell />}>
      <Route index element={<Navigate to="endpoints" replace />} />
      <Route path="endpoints/*" element={<EndpointsPage />} />
      <Route path="access" element={<AccessPage />} />
      <Route path="access/:groupId" element={<AccessPage />} />
      <Route path="overview" element={<OverviewPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="admin" element={<AdminPage />} />
    </Route>

    {/* 公开页面 */}
    <Route path="/" element={<SiteLayout />}>
      <Route index element={<LandingPage />} />
      <Route path="docs" element={<DocsPage />} />
      <Route path="auth/callback" element={<AuthCallbackPage />} />
    </Route>

    {/* 旧路径重定向 */}
    <Route path="/dashboard" element={<Navigate to="/app" replace />} />
    <Route path="/endpoints" element={<Navigate to="/app/endpoints" replace />} />
    <Route path="/permissions" element={<Navigate to="/app/access" replace />} />
    <Route path="/admin/users" element={<Navigate to="/app/admin" replace />} />
    <Route path="/features" element={<Navigate to="/" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
