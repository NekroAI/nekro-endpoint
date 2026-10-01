import { useMemo } from "react";
import { Gauge, KeyRound, Orbit, Settings2, ShieldCheck, type LucideIcon } from "lucide-react";
import { useAppPath } from "./base";

export type NavItem = { to: string; label: string; icon: LucideIcon; adminOnly?: boolean; hint: string };

export const NAV_ITEMS: NavItem[] = [
  { to: "/app/endpoints", label: "端点", icon: Orbit, hint: "命名空间星图与编辑" },
  { to: "/app/access", label: "访问", icon: KeyRound, hint: "权限组与通行卡" },
  { to: "/app/overview", label: "概览", icon: Gauge, hint: "状态与待处理事项" },
  { to: "/app/settings", label: "设置", icon: Settings2, hint: "账号、管理密钥、AI 模型" },
  { to: "/app/admin", label: "管理", icon: ShieldCheck, hint: "用户激活与端点审查", adminOnly: true },
];

/** Navigation items for the current user, mapped onto the workspace base (/app or /demo). */
export function useNavItems(isAdmin: boolean) {
  const appPath = useAppPath();
  return useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => ({ ...item, to: appPath(item.to) })),
    [appPath, isAdmin],
  );
}
