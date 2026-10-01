import { Outlet, useNavigate } from "react-router-dom";
import { BookOpen, LogOut, Moon, Sun } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { CommandProvider, useRegisterCommands, type CommandItem } from "./commands";
import { CommandPalette } from "./CommandPalette";
import { Sidebar, TabBar } from "./Sidebar";
import { SignalLine } from "./SignalLine";
import { NAV_ITEMS } from "./nav";
import { useAuth } from "../hooks/useAuth";
import { useAppTheme } from "../context/ThemeContextProvider";
import { Avatar, UserMenu } from "./UserMenu";
import { BrandMark } from "../design/brand";

/** The /app workspace: rail + content + Signal Line (docs/REDESIGN.md §4.2). */
export function AppShell() {
  return (
    <AuthGate>
      <CommandProvider>
        <ShellCommands />
        <div className="flex h-dvh overflow-hidden bg-field text-ink-1">
          <Sidebar />
          <main className="relative flex min-w-0 flex-1 flex-col">
            <MobileHeader />
            <div className="relative min-h-0 flex-1">
              <Outlet />
            </div>
            <SignalLine className="bottom-[calc(56px+env(safe-area-inset-bottom))] md:bottom-0" />
          </main>
        </div>
        <TabBar />
        <CommandPalette />
      </CommandProvider>
    </AuthGate>
  );
}

function MobileHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4 md:hidden">
      <span className="flex items-center gap-2 font-mono text-sm font-semibold">
        <BrandMark className="size-5" /> Endpoints
      </span>
      <UserMenu side="bottom">
        <button type="button" aria-label="账户菜单">
          <Avatar />
        </button>
      </UserMenu>
    </header>
  );
}

function ShellCommands() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { themeMode, toggleTheme } = useAppTheme();

  const items: CommandItem[] = [
    ...NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => ({
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
    { id: "logout", group: "账户", label: "退出登录", icon: LogOut, run: logout },
  ];
  useRegisterCommands("shell", items);
  return null;
}
