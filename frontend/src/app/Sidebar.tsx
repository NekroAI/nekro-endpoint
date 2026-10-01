import { Link, NavLink, useMatch } from "react-router-dom";
import { m as motion } from "motion/react";
import { BookOpen, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { NAV_ITEMS, type NavItem } from "./nav";
import { useAuth } from "../hooks/useAuth";
import { useAppTheme } from "../context/ThemeContextProvider";
import { useCommands } from "./commands";
import { Avatar, UserMenu } from "./UserMenu";
import { BrandMark } from "../design/brand";
import { Tooltip } from "../ui/tooltip";
import { Kbd } from "../ui/kbd";
import { cn } from "../lib/cn";
import { glide } from "../design/motion";
import { safeLocalStorage } from "../utils/storage";

const EXPANDED_KEY = "signal.sidebar.expanded";

function RailButton({
  expanded,
  label,
  icon: Icon,
  onClick,
  aside,
}: {
  expanded: boolean;
  label: string;
  icon: typeof Search;
  onClick: () => void;
  aside?: React.ReactNode;
}) {
  return (
    <Tooltip content={expanded ? null : label} side="right">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex h-9 w-full items-center gap-3 rounded-sm px-2.5 text-sm text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1"
      >
        <Icon className="size-[18px] shrink-0" />
        {expanded && <span className="flex-1 truncate text-left">{label}</span>}
        {expanded && aside}
      </button>
    </Tooltip>
  );
}

/**
 * className must be a string here: Radix Slot (Tooltip asChild) cannot merge
 * NavLink's function form and would stringify it.
 */
function RailLink({ item, expanded }: { item: NavItem; expanded: boolean }) {
  const { to, label, icon: Icon, hint } = item;
  const isActive = Boolean(useMatch({ path: to, end: false }));
  return (
    <Tooltip content={expanded ? null : `${label} · ${hint}`} side="right">
      <NavLink
        to={to}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex h-9 items-center gap-3 rounded-sm px-2.5 text-sm transition-colors",
          isActive ? "bg-surface-2 text-ink-1" : "text-ink-3 hover:bg-surface-1 hover:text-ink-1",
        )}
      >
        {isActive && (
          <motion.span
            layoutId="nav-active"
            transition={glide}
            className="absolute top-2 bottom-2 -left-2.5 w-0.5 rounded-full bg-signal shadow-signal"
          />
        )}
        <Icon
          className={cn(
            "size-[18px] shrink-0 transition-[scale] duration-200 group-hover:scale-110",
            isActive && "text-signal",
          )}
        />
        {expanded && <span className="truncate">{label}</span>}
      </NavLink>
    </Tooltip>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const { themeMode, toggleTheme } = useAppTheme();
  const { setOpen } = useCommands();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(safeLocalStorage.getItem(EXPANDED_KEY) === "1");
  }, []);
  const toggle = () =>
    setExpanded((value) => {
      safeLocalStorage.setItem(EXPANDED_KEY, value ? "0" : "1");
      return !value;
    });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== "[" ||
        event.metaKey ||
        event.ctrlKey ||
        target?.closest("input, textarea, [contenteditable], .monaco-editor")
      )
        return;
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? 216 : 60 }}
      transition={glide}
      className="relative z-20 hidden h-full shrink-0 flex-col border-r border-line bg-surface-0 px-2.5 py-3 md:flex"
    >
      <Tooltip content={expanded ? null : "返回网站首页"} side="right">
        <Link to="/" className="mb-5 flex h-9 items-center gap-2.5 rounded-sm px-1.5" aria-label="Endpoints 首页">
          <BrandMark className="size-6 shrink-0" />
          {expanded && <span className="font-mono text-sm font-semibold tracking-tight">Endpoints</span>}
        </Link>
      </Tooltip>

      <nav className="grid gap-0.5" aria-label="主导航">
        {items.map((item) => (
          <RailLink key={item.to} item={item} expanded={expanded} />
        ))}
      </nav>

      <div className="mt-auto grid gap-0.5">
        <RailButton
          expanded={expanded}
          label="搜索与命令"
          icon={Search}
          onClick={() => setOpen(true)}
          aside={
            <span className="flex gap-0.5">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          }
        />
        <Tooltip content={expanded ? null : "使用文档"} side="right">
          <NavLink
            to="/docs"
            className="flex h-9 items-center gap-3 rounded-sm px-2.5 text-sm text-ink-3 hover:bg-surface-2 hover:text-ink-1"
          >
            <BookOpen className="size-[18px] shrink-0" />
            {expanded && <span>使用文档</span>}
          </NavLink>
        </Tooltip>
        <RailButton
          expanded={expanded}
          label={themeMode === "dark" ? "切换到亮色" : "切换到暗色"}
          icon={themeMode === "dark" ? Sun : Moon}
          onClick={toggleTheme}
        />
        <RailButton
          expanded={expanded}
          label={expanded ? "收起侧栏" : "展开侧栏"}
          icon={expanded ? PanelLeftClose : PanelLeftOpen}
          onClick={toggle}
          aside={<Kbd>[</Kbd>}
        />
        <div className="my-2 h-px bg-line" />
        <UserMenu side="right">
          <button
            type="button"
            aria-label="账户菜单"
            className="flex h-10 w-full items-center gap-3 rounded-sm px-1.5 text-left hover:bg-surface-2"
          >
            <Avatar ring={user && !user.isActivated ? "caution" : undefined} />
            {expanded && (
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink-1">{user?.username}</span>
                <span className="block truncate text-2xs text-ink-3">{user?.isActivated ? "已激活" : "待激活"}</span>
              </span>
            )}
          </button>
        </UserMenu>
      </div>
    </motion.aside>
  );
}

/** Phone navigation: a bottom tab bar replaces the rail. */
export function TabBar() {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin");
  return (
    <nav
      aria-label="主导航"
      className="glass fixed inset-x-0 bottom-0 z-40 flex h-[calc(56px+env(safe-area-inset-bottom))] border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-2xs",
              isActive ? "text-signal" : "text-ink-3",
            )
          }
        >
          <Icon className="size-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
