import type { ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppPath } from "./base";
import { BookOpen, LogOut, Moon, Sun } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { CommandProvider, useRegisterCommands, type CommandItem } from "./commands";
import { CommandPalette } from "./CommandPalette";
import { Sidebar, TabBar } from "./Sidebar";
import { SignalLine, SignalLineInsetProvider } from "./SignalLine";
import { useNavItems } from "./nav";
import { useAuth } from "../hooks/useAuth";
import { useAppTheme } from "../context/ThemeContextProvider";
import { Avatar, UserMenu } from "./UserMenu";
import { BrandMark } from "../design/brand";
import { SignalProvider } from "../features/signal/SignalProvider";
import { Sparkles } from "lucide-react";

/** The /app workspace: rail + content + Signal Line (docs/REDESIGN.md §4.2). */
export function AppShell({ banner }: { banner?: ReactNode }) {
  return (
    <AuthGate>
      <CommandProvider>
        <SignalProvider>
          <SignalLineInsetProvider>
            <ShellCommands />
            <div className="flex h-dvh flex-col overflow-hidden bg-field text-ink-1">
              {banner}
              <div className="flex min-h-0 flex-1">
                <Sidebar />
                <main className="relative flex min-w-0 flex-1 flex-col">
                  <MobileHeader />
                  <SectionTransition>
                    <Outlet />
                  </SectionTransition>
                  <SignalLine className="bottom-[calc(56px+env(safe-area-inset-bottom))] md:bottom-0" />
                </main>
              </div>
            </div>
            <TabBar />
            <CommandPalette />
          </SignalLineInsetProvider>
        </SignalProvider>
      </CommandProvider>
    </AuthGate>
  );
}

/** Content rises in when switching sections; moving within a section stays still. */
function SectionTransition({ children }: { children: React.ReactNode }) {
  const section = useLocation().pathname.split("/")[2] ?? "";
  return (
    <div key={section} className="relative min-h-0 flex-1 animate-rise-in">
      {children}
    </div>
  );
}

function MobileHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4 md:hidden">
      <Link to="/" className="flex items-center gap-2 font-mono text-sm font-semibold" aria-label="Endpoints 首页">
        <BrandMark className="size-5" /> Endpoints
      </Link>
      <UserMenu side="bottom">
        <button type="button" aria-label="账户菜单">
          <Avatar />
        </button>
      </UserMenu>
    </header>
  );
}

function ShellCommands() {
  const appPath = useAppPath();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const navItems = useNavItems(user?.role === "admin");
  const { themeMode, toggleTheme } = useAppTheme();

  const items: CommandItem[] = [
    ...navItems.map((item) => ({
      id: `nav:${item.to}`,
      group: "跳转",
      label: item.label,
      hint: item.hint,
      icon: item.icon,
      run: () => navigate(item.to),
    })),
    { id: "nav:docs", group: "跳转", label: "使用文档", icon: BookOpen, run: () => navigate("/docs") },
    {
      id: "theme",
      group: "偏好",
      label: themeMode === "dark" ? "切换到亮色主题" : "切换到暗色主题",
      keywords: ["theme", "dark", "light", "主题"],
      icon: themeMode === "dark" ? Sun : Moon,
      run: toggleTheme,
    },
    {
      id: "signal:setup",
      group: "偏好",
      label: "配置 Signal 智能助手",
      hint: "接入你自己的模型",
      keywords: ["ai", "model", "模型", "signal"],
      icon: Sparkles,
      run: () => navigate(appPath("/app/settings#signal")),
    },
    { id: "logout", group: "账户", label: "退出登录", icon: LogOut, run: logout },
  ];
  useRegisterCommands("shell", items);
  return null;
}
