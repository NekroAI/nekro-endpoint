import { AlertTriangle, Filter, List, Orbit, Plus, Search, Share2, X } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { EndpointType } from "../../../../common/types";
import { useSignalLineInset } from "../../app/SignalLine";
import { useRegisterCommands, type CommandItem } from "../../app/commands";
import { TypeGlyph, typeMeta } from "../../design/glyphs";
import { glide } from "../../design/motion";
import { cn } from "../../lib/cn";
import { useHotkey } from "../../lib/hotkeys";
import { errorMessage } from "../../lib/api";
import { Button } from "../../ui/button";
import { Kbd } from "../../ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Segmented } from "../../ui/segmented";
import { Skeleton } from "../../ui/skeleton";
import { useGroups } from "../access/api";
import { CreateEndpointDialog } from "./CreateEndpointDialog";
import { FocusSheet } from "./FocusSheet";
import { EmptyNamespace, ListView } from "./ListView";
import { statusLabel, statusOf, type EndpointStatus } from "./model";
import { StatusDot } from "./status";
import { useWorkspace, WorkspaceProvider } from "./workspace";

const MapView = lazy(() => import("./MapView"));

export function EndpointsPage() {
  return (
    <WorkspaceProvider>
      <Workspace />
      <CreateEndpointDialog />
      <EndpointCommands />
    </WorkspaceProvider>
  );
}

function Workspace() {
  const { endpoints, isLoading, error, view, selectedNode, selectedPath } = useWorkspace();
  const sheetOpen = Boolean(selectedPath && selectedNode && !selectedNode.endpoint?.ghost);
  const aside = useRef<HTMLElement>(null);
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!sheetOpen || !aside.current) return setInset(0);
    const element = aside.current;
    const observer = new ResizeObserver(() => {
      // Full-screen sheet (narrow viewports): hide the Signal Line entirely.
      setInset(getComputedStyle(element).position === "fixed" ? -1 : element.offsetWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [sheetOpen]);
  useSignalLineInset(inset);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar />
      <div className="relative flex min-h-0 flex-1">
        <div className={cn("min-w-0 flex-1", view === "list" && "scrollbar-thin overflow-y-auto")}>
          {isLoading ? (
            <ListSkeleton />
          ) : error ? (
            <LoadError error={error} />
          ) : endpoints.length === 0 ? (
            <EmptyNamespace />
          ) : view === "map" ? (
            <Suspense fallback={<ListSkeleton />}>
              <MapView />
            </Suspense>
          ) : (
            <div className="px-3 pt-3 pb-32 md:px-5">
              <ListView />
            </div>
          )}
        </div>
        <AnimatePresence>
          {sheetOpen && (
            <motion.aside
              ref={aside}
              key="sheet"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={glide}
              aria-label="端点详情"
              className={cn(
                "fixed inset-0 z-50 flex flex-col overflow-hidden",
                "lg:static lg:z-auto lg:w-[min(820px,60%)] lg:shrink-0 lg:border-l lg:border-line lg:shadow-[-24px_0_48px_-24px_rgb(0_0_0/0.35)]",
              )}
            >
              <FocusSheet />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Toolbar() {
  const { endpoints, view, setView, filters, setFilters, filtersActive, openCreate, selectedPath } = useWorkspace();
  const search = useRef<HTMLInputElement>(null);
  useHotkey("/", () => search.current?.focus());
  useHotkey("n", () => openCreate(selectedPath ? `${selectedPath}/` : ""));

  const counts = useMemo(() => {
    const out: Record<EndpointStatus, number> = { live: 0, draft: 0, disabled: 0 };
    for (const endpoint of endpoints) out[statusOf(endpoint)] += 1;
    return out;
  }, [endpoints]);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 md:px-5">
      <div className="mr-auto flex min-w-0 items-center gap-4">
        <h1 className="text-md font-semibold">端点</h1>
        <div className="hidden items-center gap-3 text-xs text-ink-3 sm:flex">
          {(Object.keys(counts) as EndpointStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                setFilters({ ...filters, statuses: filters.statuses.length === 1 && filters.statuses[0] === status ? [] : [status] })
              }
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-1 py-0.5 hover:text-ink-1",
                filters.statuses.length === 1 && filters.statuses[0] === status && "text-ink-1",
              )}
            >
              <StatusDot status={status} />
              {counts[status]} {statusLabel[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex h-8 w-44 items-center gap-2 rounded-sm bg-surface-1 px-2.5 shadow-[inset_0_0_0_1px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_1px_var(--signal),0_0_0_3px_var(--signal-soft)] md:w-56">
          <Search className="size-3.5 shrink-0 text-ink-3" />
          <input
            ref={search}
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            onKeyDown={(event) => event.key === "Escape" && (setFilters({ ...filters, query: "" }), event.currentTarget.blur())}
            placeholder="筛选路径或名称"
            aria-label="筛选端点"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-4"
          />
          {filters.query ? (
            <button type="button" aria-label="清除" onClick={() => setFilters({ ...filters, query: "" })} className="text-ink-4 hover:text-ink-1">
              <X className="size-3.5" />
            </button>
          ) : (
            <Kbd>/</Kbd>
          )}
        </label>
        <FilterPopover />
        <Segmented
          label="视图"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: <span className="sr-only sm:not-sr-only">列表</span>, icon: <List /> },
            { value: "map", label: <span className="sr-only sm:not-sr-only">星图</span>, icon: <Orbit /> },
          ]}
        />
        <Button variant="primary" onClick={() => openCreate(selectedPath ? `${selectedPath}/` : "")}>
          <Plus /> <span className="hidden sm:inline">新建</span>
          <Kbd className="ml-0.5 hidden h-4 min-w-4 bg-transparent text-current opacity-70 shadow-none sm:inline-flex">N</Kbd>
        </Button>
      </div>
      {filtersActive && !filters.query && (
        <div className="flex w-full items-center gap-2 text-xs text-ink-3">
          正在按条件筛选
          <button type="button" className="text-signal hover:underline" onClick={() => setFilters({ query: "", statuses: [], types: [], group: null })}>
            清除筛选
          </button>
        </div>
      )}
    </div>
  );
}

function FilterPopover() {
  const { filters, setFilters, setHighlightGroup } = useWorkspace();
  const { data: groups = [] } = useGroups();
  const count = filters.statuses.length + filters.types.length + (filters.group ? 1 : 0);
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant={count ? "outline" : "ghost"} aria-label="筛选条件" className="relative">
          <Filter />
          {count > 0 && <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-signal text-2xs font-semibold text-signal-ink">{count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-72 gap-4">
        <FilterGroup title="状态">
          {(["live", "draft", "disabled"] as EndpointStatus[]).map((status) => (
            <Chip key={status} on={filters.statuses.includes(status)} onClick={() => setFilters({ ...filters, statuses: toggle(filters.statuses, status) })}>
              <StatusDot status={status} /> {statusLabel[status]}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup title="类型">
          {(["static", "proxy", "dynamicProxy", "script"] as EndpointType[]).map((type) => (
            <Chip key={type} on={filters.types.includes(type)} onClick={() => setFilters({ ...filters, types: toggle(filters.types, type) })}>
              <TypeGlyph type={type} className="size-3" /> {typeMeta[type].label}
            </Chip>
          ))}
        </FilterGroup>
        {groups.length > 0 && (
          <FilterGroup title="权限组">
            {groups.map((group) => (
              <Chip
                key={group.id}
                tone="pass"
                on={filters.group === group.id}
                onClick={() => setFilters({ ...filters, group: filters.group === group.id ? null : group.id })}
                onHover={(hovering) => setHighlightGroup(hovering ? group.id : null)}
              >
                {group.name}
              </Chip>
            ))}
          </FilterGroup>
        )}
      </PopoverContent>
    </Popover>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-2xs font-medium tracking-wide text-ink-4 uppercase">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
  tone = "signal",
  onHover,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "signal" | "pass";
  onHover?: (hovering: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs transition-colors",
        on
          ? tone === "pass"
            ? "bg-pass-soft text-pass shadow-[inset_0_0_0_1px_var(--pass)]"
            : "bg-signal-soft text-ink-1 shadow-[inset_0_0_0_1px_var(--signal)]"
          : "text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-2 px-5 pt-4" aria-busy="true" aria-label="正在加载端点">
      {[55, 40, 62, 35, 48, 58].map((width, index) => (
        <div key={index} className="flex h-9 items-center gap-3">
          <Skeleton className="size-4" />
          <Skeleton className="h-3" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}

function LoadError({ error }: { error: unknown }) {
  return (
    <div className="grid place-items-center py-24 text-center">
      <AlertTriangle className="mb-3 size-6 text-danger" />
      <p className="text-sm text-ink-1">无法读取端点</p>
      <p className="mt-1 text-xs text-ink-3">{errorMessage(error)}</p>
    </div>
  );
}

function EndpointCommands() {
  const { endpoints, select, openCreate, setView } = useWorkspace();
  const items: CommandItem[] = [
    { id: "endpoint:new", group: "端点", label: "新建端点", icon: Plus, shortcut: "N", run: () => openCreate("") },
    { id: "endpoint:view-map", group: "端点", label: "切换到星图视图", icon: Orbit, run: () => setView("map") },
    { id: "endpoint:view-list", group: "端点", label: "切换到列表视图", icon: List, run: () => setView("list") },
    ...endpoints.map((endpoint) => ({
      id: `endpoint:${endpoint.id}`,
      group: "跳转到端点",
      label: endpoint.path,
      hint: endpoint.name,
      keywords: [endpoint.name, endpoint.type],
      icon: ({ className }: { className?: string }) => <TypeGlyph type={endpoint.type} className={className} />,
      run: () => void select(endpoint.path),
    })),
    ...endpoints.map((endpoint) => ({
      id: `endpoint-share:${endpoint.id}`,
      group: "分享",
      label: `分享 ${endpoint.path}`,
      keywords: [endpoint.name, "share", "二维码", "通行卡"],
      icon: Share2,
      run: () => void select(endpoint.path, "share"),
    })),
  ];
  useRegisterCommands("endpoints", items);
  return null;
}
