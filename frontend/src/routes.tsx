import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import { PageFallback } from "./app/PageFallback";
import { SiteLayout } from "./features/site/SiteLayout";
import { LandingPage } from "./features/site/LandingPage";
import { DocsPage } from "./features/site/DocsPage";
import { AuthCallbackPage } from "./features/site/AuthCallbackPage";
import { InitPage } from "./features/site/InitPage";

// Workspace pages are auth-gated (SSR renders the shell skeleton), so they are
// split per route; public pages stay eager for complete server rendering.
const EndpointsPage = lazy(() => import("./features/endpoints/EndpointsPage").then((m) => ({ default: m.EndpointsPage })));
const AccessPage = lazy(() => import("./features/access/AccessPage").then((m) => ({ default: m.AccessPage })));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const OverviewPage = lazy(() => import("./features/overview/OverviewPage").then((m) => ({ default: m.OverviewPage })));
const AdminPage = lazy(() => import("./features/admin/AdminPage").then((m) => ({ default: m.AdminPage })));

const DemoRoot = lazy(() => import("./features/demo/DemoRoot").then((m) => ({ default: m.DemoRoot })));

const page = (element: ReactNode) => <Suspense fallback={<PageFallback />}>{element}</Suspense>;

const workspacePages = (
  <>
    <Route index element={<Navigate to="endpoints" replace />} />
    <Route path="endpoints/*" element={page(<EndpointsPage />)} />
    <Route path="access" element={page(<AccessPage />)} />
    <Route path="access/:groupId" element={page(<AccessPage />)} />
    <Route path="overview" element={page(<OverviewPage />)} />
    <Route path="settings" element={page(<SettingsPage />)} />
    <Route path="admin" element={page(<AdminPage />)} />
  </>
);

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
      {workspacePages}
    </Route>

    {/* 浏览器内演示：同一套工作区，数据在本地模拟（features/demo） */}
    <Route
      path="/demo"
      element={
        <Suspense fallback={<PageFallback />}>
          <DemoRoot />
        </Suspense>
      }
    >
      {workspacePages}
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
