import { Moon, Sun } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAppTheme } from "../../context/ThemeContextProvider";
import { useAuth } from "../../hooks/useAuth";
import { BrandMark } from "../../design/brand";
import { GitHubMark } from "../../design/github";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/button";

/** Public pages: landing, docs, auth callback. */
export function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-field text-ink-1">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-ink-3 md:px-8">
          <span className="flex items-center gap-2 font-mono">
            <BrandMark className="size-4" /> Endpoints · 在边缘发布与分享你的端点
          </span>
          <span className="flex gap-4">
            <Link to="/docs" className="hover:text-ink-1">
              文档
            </Link>
            <a href="/doc" className="hover:text-ink-1">
              API 参考
            </a>
            <a href="https://github.com/NekroAI/nekro-endpoint" target="_blank" rel="noreferrer" className="hover:text-ink-1">
              GitHub
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

function SiteHeader() {
  const { isAuthenticated, isLoading, login, isLoginLoading } = useAuth();
  const { themeMode, toggleTheme } = useAppTheme();
  return (
    <header className="sticky top-0 z-40 border-b border-line glass">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
          <BrandMark className="size-5" /> Endpoints
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink to="/docs" className={({ isActive }) => cn("rounded-sm px-2.5 py-1.5 text-ink-3 hover:text-ink-1", isActive && "text-ink-1")}>
            文档
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label={themeMode === "dark" ? "切换到亮色" : "切换到暗色"} onClick={toggleTheme}>
            {themeMode === "dark" ? <Sun /> : <Moon />}
          </Button>
          {isLoading ? (
            <span className="h-8 w-24" />
          ) : isAuthenticated ? (
            <Button asChild variant="primary">
              <Link to="/app">进入控制台</Link>
            </Button>
          ) : (
            <Button variant="secondary" onClick={login} disabled={isLoginLoading}>
              <GitHubMark /> 登录
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
