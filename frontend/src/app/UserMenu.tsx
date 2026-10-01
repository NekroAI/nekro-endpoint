import { BookOpen, LogOut, Moon, Settings2, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAppTheme } from "../context/ThemeContextProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../lib/cn";

export function Avatar({ className, ring }: { className?: string; ring?: "caution" | "pass" }) {
  const { user } = useAuth();
  return (
    <span
      className={cn(
        "relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 text-xs font-semibold text-ink-2",
        ring === "caution" && "shadow-[0_0_0_2px_var(--bg),0_0_0_3.5px_var(--caution)]",
        ring === "pass" && "shadow-[0_0_0_2px_var(--bg),0_0_0_3.5px_var(--pass)]",
        className,
      )}
    >
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : user?.username?.[0]?.toUpperCase()}
    </span>
  );
}

export function UserMenu({ side = "right", children }: { side?: "right" | "top" | "bottom"; children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { themeMode, toggleTheme } = useAppTheme();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="size-9" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink-1">{user.username}</div>
            <div className="truncate text-xs text-ink-3">{user.email ?? "未公开邮箱"}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 px-2 pb-2">
          {user.role === "admin" && <Tag tone="pass">管理员</Tag>}
          {user.isActivated ? <Tag tone="signal">已激活</Tag> : <Tag tone="caution">待激活 · 暂不能发布</Tag>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/app/settings")}>
          <Settings2 /> 设置
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/docs")}>
          <BookOpen /> 使用文档
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={toggleTheme}>
          {themeMode === "dark" ? <Sun /> : <Moon />} 切换到{themeMode === "dark" ? "亮色" : "暗色"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="danger" onSelect={logout}>
          <LogOut /> 退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Tag({ tone, children }: { tone: "signal" | "pass" | "caution"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-2xs font-medium",
        tone === "signal" && "bg-signal-soft text-signal",
        tone === "pass" && "bg-pass-soft text-pass",
        tone === "caution" && "bg-caution-soft text-caution",
      )}
    >
      {children}
    </span>
  );
}
