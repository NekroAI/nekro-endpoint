import { ChevronRight, GripVertical, Lock, Plus } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { m as motion } from "motion/react";
import { DirectoryGlyph, TypeGlyph } from "../../design/glyphs";
import { relativeTime, absoluteTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Badge } from "../../ui/badge";
import { Tooltip } from "../../ui/tooltip";
import { useGroups } from "../access/api";
import { useReorderEndpoints } from "./api";
import { proxyTargetHost, statusOf, statusLabel, type EndpointView } from "./model";
import type { NamespaceNode } from "./namespace";
import { StatusDot } from "./status";
import { useWorkspace } from "./workspace";
import { glide } from "../../design/motion";

type Row = { node: NamespaceNode; depth: number; hasChildren: boolean; parent: NamespaceNode };

function nodeVisible(node: NamespaceNode, visible: (endpoint: EndpointView) => boolean): boolean {
  return (node.endpoint ? visible(node.endpoint) : false) || node.children.some((child) => nodeVisible(child, visible));
}

export function ListView() {
  const { namespace, visible, filtersActive, selectedPath, select, highlightGroup, ghostKinds } = useWorkspace();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const reorder = useReorderEndpoints();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ path: string; after: boolean } | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const rows = useMemo(() => {
    const out: Row[] = [];
    const walk = (node: NamespaceNode, depth: number) => {
      for (const child of node.children) {
        if (!nodeVisible(child, visible)) continue;
        const hasChildren = child.children.some((grandchild) => nodeVisible(grandchild, visible));
        out.push({ node: child, depth, hasChildren, parent: node });
        if (hasChildren && (filtersActive || !collapsed.has(child.path))) walk(child, depth + 1);
      }
    };
    walk(namespace, 0);
    return out;
  }, [namespace, visible, filtersActive, collapsed]);

  const toggle = (path: string, open?: boolean) =>
    setCollapsed((current) => {
      const next = new Set(current);
      const isOpen = !next.has(path);
      if (open ?? !isOpen) next.delete(path);
      else next.add(path);
      return next;
    });

  const focusRow = (index: number) => {
    const row = rows[Math.max(0, Math.min(rows.length - 1, index))];
    if (row) rowRefs.current.get(row.node.path)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number, row: Row) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusRow(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusRow(index - 1);
        break;
      case "ArrowRight":
        if (row.hasChildren) toggle(row.node.path, true);
        break;
      case "ArrowLeft":
        if (row.hasChildren && !collapsed.has(row.node.path)) toggle(row.node.path, false);
        else focusRow(rows.findIndex((candidate) => candidate.node === row.parent));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        void select(row.node.path);
        break;
    }
  };

  // Reordering among endpoint siblings, persisted through POST /endpoints/reorder.
  const onDrop = (event: DragEvent, target: Row) => {
    event.preventDefault();
    const source = rows.find((row) => row.node.path === dragging);
    setDragging(null);
    setDropTarget(null);
    if (!source || source.parent !== target.parent || source === target || !dropTarget) return;
    const siblings = target.parent.children.filter((child) => child.endpoint);
    const ordered = siblings.filter((child) => child !== source.node);
    const at = ordered.indexOf(target.node) + (dropTarget.after ? 1 : 0);
    ordered.splice(at, 0, source.node);
    reorder.mutate(ordered.map((child, index) => ({ id: child.endpoint!.id, sortOrder: index })));
  };

  return (
    <div role="tree" aria-label="端点命名空间" className="grid gap-px">
      {rows.map((row, index) => {
        const { node, depth, hasChildren } = row;
        const endpoint = node.endpoint;
        const selected = node.path === selectedPath;
        const open = filtersActive || !collapsed.has(node.path);
        const dimmed = highlightGroup && !(endpoint?.groups.includes(highlightGroup) ?? false);
        const dropHere = dropTarget?.path === node.path;
        const ghost = endpoint?.ghost ? "create" : ghostKinds.get(node.path);
        return (
          <div
            key={node.path}
            ref={(element) => {
              if (element) rowRefs.current.set(node.path, element);
              else rowRefs.current.delete(node.path);
            }}
            role="treeitem"
            aria-level={depth + 1}
            aria-selected={selected}
            aria-expanded={hasChildren ? open : undefined}
            tabIndex={selected || (!selectedPath && index === 0) ? 0 : -1}
            onClick={() => !endpoint?.ghost && void select(node.path)}
            onKeyDown={(event) => onKeyDown(event, index, row)}
            draggable={Boolean(endpoint) && !endpoint?.ghost && !filtersActive}
            onDragStart={(event) => {
              setDragging(node.path);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              setDragging(null);
              setDropTarget(null);
            }}
            onDragOver={(event) => {
              const source = rows.find((candidate) => candidate.node.path === dragging);
              if (!source || source.parent !== row.parent || !endpoint) return;
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              setDropTarget({ path: node.path, after: event.clientY > rect.top + rect.height / 2 });
            }}
            onDrop={(event) => onDrop(event, row)}
            className={cn(
              "group relative flex h-11 cursor-default items-center gap-2 rounded-sm pr-3 transition-[background-color,opacity] outline-none",
              "focus-visible:shadow-[inset_0_0_0_1px_var(--focus)]",
              selected ? "bg-surface-2" : "hover:bg-surface-1",
              dimmed && "opacity-35",
              dragging === node.path && "opacity-40",
              ghost === "create" && "animate-ghost outline-1 -outline-offset-1 outline-signal outline-dashed",
              ghost === "update" && "animate-ghost shadow-[inset_0_0_0_1px_var(--signal)]",
              ghost === "publish" && "animate-ghost shadow-[inset_0_0_0_1px_var(--signal),0_0_16px_-6px_var(--signal)]",
              ghost === "delete" && "animate-ghost bg-danger-soft",
            )}
            style={{ paddingLeft: 8 + depth * 20 }}
          >
            {selected && (
              <motion.span layoutId="list-selected" transition={glide} className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-signal shadow-signal" />
            )}
            {dropHere && (
              <span className={cn("absolute right-2 left-2 h-0.5 rounded-full bg-signal", dropTarget.after ? "-bottom-px" : "-top-px")} />
            )}
            <button
              type="button"
              tabIndex={-1}
              aria-label={open ? "折叠" : "展开"}
              onClick={(event) => {
                event.stopPropagation();
                toggle(node.path);
              }}
              className={cn("grid size-5 shrink-0 place-items-center rounded-sm text-ink-4 hover:text-ink-1", !hasChildren && "invisible")}
            >
              <ChevronRight className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} />
            </button>

            {endpoint ? (
              <TypeGlyph
                type={endpoint.type}
                className={cn("size-4 shrink-0", endpoint.type === "proxy" || endpoint.type === "dynamicProxy" ? "text-route" : "text-ink-2")}
              />
            ) : (
              <DirectoryGlyph className="size-4 shrink-0 text-ink-4" />
            )}

            <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
              <span
                className={cn(
                  "truncate font-mono text-sm",
                  endpoint ? "text-ink-1" : "text-ink-3",
                  endpoint && !endpoint.enabled && "text-ink-3 line-through decoration-ink-4",
                )}
              >
                {node.segment}
                {!endpoint && <span className="text-ink-4">/</span>}
              </span>
              {endpoint ? (
                <span className="hidden truncate text-xs text-ink-3 sm:inline">{endpoint.name}</span>
              ) : (
                <span className="text-2xs text-ink-4">{node.count} 个端点</span>
              )}
            </div>

            {ghost && (
              <Badge tone={ghost === "delete" ? "danger" : "signal"} className="shrink-0">
                {{ create: "待创建", update: "待修改", publish: "待发布", delete: "待删除" }[ghost]}
              </Badge>
            )}
            {endpoint && !endpoint.ghost && <RowMeta endpoint={endpoint} />}

            {endpoint && !filtersActive && (
              <GripVertical className="size-3.5 shrink-0 text-ink-4 opacity-0 group-hover:opacity-100" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RowMeta({ endpoint }: { endpoint: EndpointView }) {
  const { data: groups } = useGroups();
  const status = statusOf(endpoint);
  const host = proxyTargetHost(endpoint);
  const names = endpoint.groups.map((id) => groups?.find((group) => group.id === id)?.name ?? "未知组");
  return (
    <div className="flex shrink-0 items-center gap-2">
      {host && (
        <Badge tone="route" className="hidden max-w-44 lg:inline-flex" title={host}>
          <span className="truncate font-mono">↗ {host}</span>
        </Badge>
      )}
      {endpoint.accessControl === "authenticated" &&
        (names.length ? (
          <Badge tone="pass" className="hidden md:inline-flex" title={names.join("、")}>
            <Lock /> {names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`}
          </Badge>
        ) : (
          <Badge tone="caution" title="受保护但没有关联权限组，访问会返回 500">
            <Lock /> 未关联权限组
          </Badge>
        ))}
      <Tooltip content={`${statusLabel[status]} · 更新于 ${absoluteTime(endpoint.updatedAt)}`}>
        <span className="flex w-24 items-center justify-end gap-2 text-xs text-ink-3">
          <span className="hidden truncate xl:inline">{relativeTime(endpoint.updatedAt)}</span>
          <StatusDot status={status} />
        </span>
      </Tooltip>
    </div>
  );
}

export function EmptyNamespace() {
  const { openCreate } = useWorkspace();
  return (
    <div className="grid place-items-center py-24 text-center">
      <div className="relative mb-8 grid size-28 place-items-center">
        <span className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_var(--line)]" />
        <span className="absolute inset-5 rounded-full shadow-[inset_0_0_0_1px_var(--line-strong)]" />
        <span className="size-3 rounded-full shadow-[inset_0_0_0_1.5px_var(--ink-3)]" />
      </div>
      <h2 className="text-lg font-semibold">布下第一个信号点</h2>
      <p className="mt-2 max-w-sm text-sm text-ink-3">端点是你在边缘发布的一个地址：托管一段配置，或把请求转发到任何地方。</p>
      <button
        type="button"
        onClick={() => openCreate()}
        className="mt-6 inline-flex h-9 items-center gap-2 rounded-sm bg-signal px-4 text-sm font-medium text-signal-ink hover:shadow-signal"
      >
        <Plus className="size-4" /> 新建端点
      </button>
    </div>
  );
}
