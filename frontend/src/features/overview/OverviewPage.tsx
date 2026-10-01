import { AlertTriangle, ArrowRight, CalendarClock, CircleSlash, KeyRound, Link2Off, Lock, Plus } from "lucide-react";
import { lazy, Suspense, useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { m as motion } from "motion/react";
import type { DynamicProxyConfig } from "../../../../common/types";
import { Page } from "../../app/Page";
import { useAuth } from "../../hooks/useAuth";
import { glide } from "../../design/motion";
import { TypeGlyph } from "../../design/glyphs";
import { relativeTime } from "../../lib/format";
import { spotlight } from "../../lib/spotlight";
import { CountUp } from "../../ui/count-up";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { useGroups, useKeysForGroups } from "../access/api";
import { keyStatus } from "../access/keyStatus";
import { statusOf, type EndpointStatus } from "../endpoints/model";
import { StatusDot } from "../endpoints/status";
import { WorkspaceProvider, useWorkspace } from "../endpoints/workspace";
import { ActivationCard } from "../activation/ActivationCard";

const MapView = lazy(() => import("../endpoints/MapView"));

export function OverviewPage() {
  return (
    <WorkspaceProvider>
      <Overview />
    </WorkspaceProvider>
  );
}

type Attention = {
  id: string;
  tone: "caution" | "danger" | "info";
  icon: ReactNode;
  title: string;
  detail: string;
  to: string;
};

function Overview() {
  const { user } = useAuth();
  const { endpoints, isLoading } = useWorkspace();
  const { data: groups = [] } = useGroups();
  const { keys } = useKeysForGroups(groups.map((group) => group.id));

  const counts = useMemo(() => {
    const out: Record<EndpointStatus, number> = { live: 0, draft: 0, disabled: 0 };
    for (const endpoint of endpoints) out[statusOf(endpoint)] += 1;
    return out;
  }, [endpoints]);

  const usableKeys = keys.filter((key) => ["active", "expiring"].includes(keyStatus(key)));
  const totalUsage = keys.reduce((sum, key) => sum + key.usageCount, 0);

  const attention = useMemo<Attention[]>(() => {
    const items: Attention[] = [];
    for (const endpoint of endpoints) {
      if (endpoint.accessControl === "authenticated" && endpoint.groups.length === 0) {
        items.push({
          id: `nogroup:${endpoint.id}`,
          tone: "danger",
          icon: <Lock />,
          title: `${endpoint.path} 没有关联权限组`,
          detail: "受保护但无人可访问，请求会返回 500。",
          to: `/app/endpoints${endpoint.path}?tab=settings`,
        });
      }
      if (endpoint.type === "dynamicProxy" && !(endpoint.config as DynamicProxyConfig).baseUrl) {
        items.push({
          id: `nobase:${endpoint.id}`,
          tone: "caution",
          icon: <Link2Off />,
          title: `${endpoint.path} 还没有基础 URL`,
          detail: "动态代理需要先填写基础 URL 才能发布。",
          to: `/app/endpoints${endpoint.path}`,
        });
      }
      if (endpoint.isPublished && !endpoint.enabled) {
        items.push({
          id: `disabled:${endpoint.id}`,
          tone: "info",
          icon: <CircleSlash />,
          title: `${endpoint.path} 已发布但处于停用状态`,
          detail: "访问返回 503。不再需要的话可以取消发布或删除。",
          to: `/app/endpoints${endpoint.path}?tab=settings`,
        });
      }
    }
    for (const key of keys) {
      if (keyStatus(key) === "expiring") {
        const group = groups.find((candidate) => candidate.id === key.permissionGroupId);
        items.push({
          id: `expiring:${key.id}`,
          tone: "caution",
          icon: <CalendarClock />,
          title: `通行卡「${key.description || "未命名"}」${relativeTime(key.expiresAt)}到期`,
          detail: `${group?.name ?? "权限组"} · 到期后持卡人将无法访问。`,
          to: `/app/access/${key.permissionGroupId}`,
        });
      }
    }
    return items;
  }, [user, endpoints, keys, groups]);

  const recent = useMemo(
    () => [...endpoints].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6),
    [endpoints],
  );

  return (
    <Page>
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={glide} className="mb-10">
        <div className="mb-3 font-mono text-xs text-ink-3">/e/{user?.username}</div>
        <h1 className="text-xl leading-snug font-semibold tracking-tight md:text-2xl md:leading-tight">
          {isLoading ? (
            <Skeleton className="h-10 w-80" />
          ) : (
            <>
              <span className="text-signal">{counts.live}</span> 个端点在线
              <span className="text-ink-3">
                {" "}
                · {counts.draft} 个草稿{counts.disabled ? ` · ${counts.disabled} 个停用` : ""}
              </span>
            </>
          )}
        </h1>
        <p className="mt-3 text-sm text-ink-3">
          {attention.length ? `有 ${attention.length} 件事需要你看一下。` : "一切正常，没有需要处理的事项。"}
        </p>
      </motion.header>

      <ActivationCard className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="relative h-[420px] overflow-hidden rounded-lg bg-surface-0 shadow-[inset_0_0_0_1px_var(--line)]">
          {endpoints.length ? (
            <Suspense fallback={<Skeleton className="size-full" />}>
              <MapView mini />
            </Suspense>
          ) : isLoading ? (
            <Skeleton className="size-full" />
          ) : (
            <div className="grid size-full place-items-center text-center">
              <div>
                <p className="text-sm text-ink-3">还没有端点</p>
                <Button asChild variant="primary" className="mt-4">
                  <Link to="/app/endpoints">
                    <Plus /> 布下第一个信号点
                  </Link>
                </Button>
              </div>
            </div>
          )}
          <Link
            to="/app/endpoints"
            className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-ink-2 glass shadow-pop hover:text-ink-1"
          >
            打开端点 <ArrowRight className="size-3" />
          </Link>
        </section>

        <div className="grid content-start gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="在线端点" value={counts.live} hint={`共 ${endpoints.length} 个`} />
            <Stat label="权限组" value={groups.length} hint={`${usableKeys.length} 张有效通行卡`} />
            <Stat label="通行卡调用" value={totalUsage} hint="累计访问次数" />
            <Stat
              label="受保护端点"
              value={endpoints.filter((endpoint) => endpoint.accessControl === "authenticated").length}
              hint="需要通行卡"
            />
          </div>
          <section className="rounded-lg bg-surface-0 shadow-[inset_0_0_0_1px_var(--line)]">
            <h2 className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm font-medium">
              <AlertTriangle className="size-4 text-caution" /> 需要你注意
            </h2>
            {attention.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-3">没有待处理事项。</p>
            ) : (
              <ul className="divide-y divide-line">
                {attention.map((item) => (
                  <li key={item.id}>
                    <Link to={item.to} className="group flex gap-3 px-5 py-3 hover:bg-surface-1">
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 [&_svg]:size-4",
                          item.tone === "danger" && "text-danger",
                          item.tone === "caution" && "text-caution",
                          item.tone === "info" && "text-ink-3",
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink-1">{item.title}</span>
                        <span className="block text-xs text-ink-3">{item.detail}</span>
                      </span>
                      <ArrowRight className="mt-1 size-3.5 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="mt-6 rounded-lg bg-surface-0 shadow-[inset_0_0_0_1px_var(--line)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium">最近更新</h2>
          <Link to="/app/access" className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink-1">
            <KeyRound className="size-3" /> 管理通行卡
          </Link>
        </div>
        <ul className="divide-y divide-line">
          {recent.map((endpoint) => (
            <li key={endpoint.id}>
              <Link
                to={`/app/endpoints${endpoint.path}`}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-1"
              >
                <TypeGlyph type={endpoint.type} className="size-4 text-ink-2" />
                <span className="font-mono text-sm text-ink-1">{endpoint.path}</span>
                <span className="hidden truncate text-xs text-ink-3 sm:inline">{endpoint.name}</span>
                <span className="ml-auto flex items-center gap-3 text-xs text-ink-3">
                  {relativeTime(endpoint.updatedAt)}
                  <StatusDot status={statusOf(endpoint)} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}

/** A plain stat tile: the number in body ink, the label muted (no chart needed). */
function Stat({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <div {...spotlight} className="spotlight rounded-lg bg-surface-0 p-4 shadow-[inset_0_0_0_1px_var(--line)]">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold tracking-tight text-ink-1 tabular-nums">
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </div>
      <div className="mt-0.5 truncate text-2xs text-ink-4">{hint}</div>
    </div>
  );
}
