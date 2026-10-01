import "@xyflow/react/dist/base.css";
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  PanOnScrollMode,
  Position,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { hierarchy, tree } from "d3-hierarchy";
import { Lock, Maximize, Minus, Plus } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { m as motion } from "motion/react";
import { BrandMark } from "../../design/brand";
import { TypeGlyph } from "../../design/glyphs";
import { cn } from "../../lib/cn";
import { Tooltip } from "../../ui/tooltip";
import { useGroups } from "../access/api";
import { proxyTargetHost, statusOf, type EndpointView } from "./model";
import type { NamespaceNode } from "./namespace";
import { StatusDot } from "./status";
import { useWorkspace } from "./workspace";

/**
 * Namespace Map (docs/REDESIGN.md §4.3): /e/{username} at the origin, path
 * prefixes fanning out radially, proxies wired to their upstream host.
 */
type OriginData = { label: string };
type DirData = { node: NamespaceNode; depth: number };
type EndpointData = { node: NamespaceNode; endpoint: EndpointView; depth: number };

/** Paths from the origin to the hovered node, lit up as a trace. */
const TraceContext = createContext<Set<string>>(new Set());

const chainOf = (path: string | null) => {
  const chain = new Set<string>();
  if (!path) return chain;
  const parts = path.split("/").filter(Boolean);
  parts.forEach((_, index) => chain.add(`/${parts.slice(0, index + 1).join("/")}`));
  return chain;
};

/** Signal propagation: nodes surface ring by ring from the origin, once. */
const surface = (depth: number) => ({
  initial: { opacity: 0, scale: 0.7 },
  animate: { opacity: 1, scale: 1 },
  transition: { type: "spring" as const, stiffness: 260, damping: 24, delay: 0.1 + depth * 0.09 },
});
type HostData = { host: string };

type MapNode =
  | Node<OriginData, "origin">
  | Node<DirData, "dir">
  | Node<EndpointData, "endpoint">
  | Node<HostData, "host">;

const RING = 190;
const HOST_OFFSET = 150;

function layout(root: NamespaceNode, username: string) {
  const h = hierarchy(root, (node) => node.children);
  const depth = h.height || 1;
  const radius = Math.max(RING, depth * RING);
  tree<NamespaceNode>()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.6) / Math.max(1, a.depth))(h);

  const nodes: MapNode[] = [];
  const edges: Edge[] = [];
  const polar = (angle: number, r: number) => ({
    x: r * Math.cos(angle - Math.PI / 2),
    y: r * Math.sin(angle - Math.PI / 2),
  });

  h.each((point) => {
    const { x: angle = 0, y: r = 0 } = point as unknown as { x: number; y: number };
    const position = point.depth === 0 ? { x: 0, y: 0 } : polar(angle, r);
    const id = point.data.path || "__origin";
    if (point.depth === 0) {
      nodes.push({ id, type: "origin", position, data: { label: `/e/${username}` }, selectable: false });
    } else if (point.data.endpoint) {
      nodes.push({
        id,
        type: "endpoint",
        position,
        data: { node: point.data, endpoint: point.data.endpoint, depth: point.depth },
      });
      const host = proxyTargetHost(point.data.endpoint);
      if (host) {
        const hostId = `host:${id}`;
        nodes.push({
          id: hostId,
          type: "host",
          position: polar(angle, r + HOST_OFFSET),
          data: { host },
          selectable: false,
        });
        edges.push({ id: `e:${hostId}`, source: id, target: hostId, type: "straight", className: "map-edge-route" });
      }
    } else {
      nodes.push({ id, type: "dir", position, data: { node: point.data, depth: point.depth } });
    }
    if (point.parent) {
      edges.push({
        id: `e:${id}`,
        source: point.parent.data.path || "__origin",
        target: id,
        type: "straight",
        className: "map-edge",
      });
    }
  });
  return { nodes, edges };
}

const nodeTypes = { origin: OriginNode, dir: DirNode, endpoint: EndpointNode, host: HostNode };

/** `mini`: an embedded overview without legend and zoom controls. */
export default function MapView({ mini = false }: { mini?: boolean }) {
  return (
    <ReactFlowProvider>
      <MapCanvas mini={mini} />
    </ReactFlowProvider>
  );
}

function MapCanvas({ mini }: { mini: boolean }) {
  const { namespace, username, select, selectedPath } = useWorkspace();
  const { nodes, edges: baseEdges } = useMemo(() => layout(namespace, username), [namespace, username]);
  const [hovered, setHovered] = useState<string | null>(null);
  const trace = useMemo(() => chainOf(hovered), [hovered]);
  const edges = useMemo(
    () =>
      baseEdges.map((edge) => {
        const lit = trace.has(edge.target) || (hovered !== null && edge.target === `host:${hovered}`);
        return lit ? { ...edge, className: `${edge.className} map-edge-trace` } : edge;
      }),
    [baseEdges, trace, hovered],
  );
  const flow = useReactFlow();
  const container = useRef<HTMLDivElement>(null);

  // Refit when the canvas is resized (e.g. the Focus Sheet opens).
  useEffect(() => {
    if (!container.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => void flow.fitView({ padding: 0.18, duration: 300 }));
    });
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [flow]);

  // Bring the selected endpoint into view without changing zoom.
  useEffect(() => {
    const node = nodes.find((candidate) => candidate.id === selectedPath);
    if (!node) return;
    const zoom = flow.getZoom();
    void flow.setCenter(node.position.x, node.position.y, { zoom, duration: 400 });
  }, [selectedPath, nodes, flow]);

  return (
    <div ref={container} className="signal-map relative h-full w-full">
      <TraceContext.Provider value={trace}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodeOrigin={[0.5, 0.5]}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={mini ? 0.5 : 0.2}
          maxZoom={2.2}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          // Trackpads: two-finger scroll pans, pinch zooms (macOS sends pinch as ctrl+wheel).
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          panOnScrollSpeed={1}
          zoomOnScroll={false}
          zoomOnPinch
          // Non-interactive nodes get pointer-events: none in React Flow, so
          // selection must go through onNodeClick rather than handlers inside nodes.
          onNodeClick={(_, node) => {
            if (node.type === "dir") void select(node.id);
            if (node.type === "endpoint" && !(node.data as EndpointData).endpoint.ghost) void select(node.id);
          }}
          onPaneClick={() => void select("")}
          onNodeMouseEnter={(_, node) => (node.type === "endpoint" || node.type === "dir") && setHovered(node.id)}
          onNodeMouseLeave={() => setHovered(null)}
          attributionPosition="bottom-left"
          aria-label="命名空间星图"
        />
      </TraceContext.Provider>
      {!mini && <MapControls />}
      {!mini && <Legend />}
    </div>
  );
}

function useZoom() {
  return useStore((state) => state.transform[2]);
}

function useDimmed(endpoint: EndpointView | undefined, node: NamespaceNode) {
  const { visible, filtersActive, highlightGroup } = useWorkspace();
  if (highlightGroup) return !(endpoint?.groups.includes(highlightGroup) ?? false);
  if (!filtersActive) return false;
  const anyVisible = (candidate: NamespaceNode): boolean =>
    (candidate.endpoint ? visible(candidate.endpoint) : false) || candidate.children.some(anyVisible);
  return endpoint ? !visible(endpoint) : !anyVisible(node);
}

const hidden = "!size-px !min-h-0 !min-w-0 !border-0 !bg-transparent opacity-0";

function OriginNode({ data }: NodeProps<Node<OriginData>>) {
  return (
    <div className="grid place-items-center">
      <div className="relative grid size-16 place-items-center rounded-full bg-surface-solid shadow-[0_0_0_1px_var(--line-strong),0_0_40px_var(--signal-soft)]">
        <span className="absolute -inset-3 rounded-full shadow-[inset_0_0_0_1px_var(--line)]" />
        <BrandMark className="size-8" />
      </div>
      <div className="mt-2 font-mono text-xs whitespace-nowrap text-ink-2">{data.label}</div>
      <Handle type="source" position={Position.Top} className={cn(hidden, "!top-8 !left-8")} />
    </div>
  );
}

function DirNode({ data }: NodeProps<Node<DirData>>) {
  const { selectedPath } = useWorkspace();
  const traced = useContext(TraceContext).has(data.node.path);
  const dimmed = useDimmed(undefined, data.node);
  const selected = selectedPath === data.node.path;
  return (
    <motion.button
      {...surface(data.depth)}
      type="button"
      aria-label={`目录 ${data.node.path}，${data.node.count} 个端点`}
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-surface-solid px-2.5 py-1 font-mono text-xs whitespace-nowrap text-ink-3 transition-[opacity,color,box-shadow] duration-200",
        "shadow-[0_0_0_1px_var(--line)] hover:text-ink-1",
        selected && "text-ink-1 shadow-[0_0_0_1px_var(--ink-3)]",
        traced && "text-ink-1 shadow-[0_0_0_1px_color-mix(in_srgb,var(--signal)_60%,transparent)]",
        dimmed && "opacity-25",
      )}
    >
      {data.node.segment}/<span className="text-2xs text-ink-4">{data.node.count}</span>
      <Handle type="target" position={Position.Top} className={hidden} />
      <Handle type="source" position={Position.Bottom} className={hidden} />
    </motion.button>
  );
}

function EndpointNode({ data }: NodeProps<Node<EndpointData>>) {
  const { selectedPath, ghostKinds } = useWorkspace();
  const { data: groups = [] } = useGroups();
  const zoom = useZoom();
  const { endpoint, node } = data;
  const status = statusOf(endpoint);
  const selected = selectedPath === node.path;
  const dimmed = useDimmed(endpoint, node);
  const rings = endpoint.accessControl === "authenticated" ? Math.max(1, Math.min(endpoint.groups.length, 3)) : 0;
  const compact = zoom < 0.55 && !selected;
  const groupNames = endpoint.groups.map((id) => groups.find((group) => group.id === id)?.name ?? "未知组");
  const ghost = endpoint.ghost ? "create" : ghostKinds.get(node.path);

  return (
    <Tooltip content={compact ? `${endpoint.path} · ${endpoint.name}` : null}>
      <motion.button
        {...surface(data.depth)}
        type="button"
        aria-label={`${endpoint.name}，${endpoint.path}`}
        aria-current={selected || undefined}
        className={cn(
          "group relative flex items-center gap-2 rounded-full bg-surface-solid py-1.5 pr-3 pl-2 whitespace-nowrap transition-[opacity,transform,box-shadow] duration-200",
          "shadow-[0_0_0_1px_var(--line-strong)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--signal),0_0_22px_-4px_var(--signal),0_8px_20px_-8px_rgb(0_0_0/0.5)]",
          status === "live" &&
            "shadow-[0_0_0_1px_color-mix(in_srgb,var(--signal)_45%,transparent),0_0_18px_-4px_var(--signal)]",
          status === "draft" && "shadow-none outline-1 outline-offset-0 outline-ink-3 outline-dashed",
          status === "disabled" && "opacity-60",
          selected && "scale-110 shadow-[0_0_0_2px_var(--signal),0_0_28px_-2px_var(--signal)]",
          compact && "p-1.5",
          dimmed && "opacity-20",
          ghost === "create" && "animate-ghost shadow-none outline-1 outline-signal outline-dashed",
          ghost === "update" && "animate-ghost shadow-[0_0_0_2px_var(--signal)]",
          ghost === "publish" && "animate-ghost shadow-[0_0_0_2px_var(--signal),0_0_28px_var(--signal)]",
          ghost === "delete" && "animate-ghost shadow-[0_0_0_2px_var(--danger)] line-through",
        )}
      >
        {Array.from({ length: rings }, (_, index) => (
          <span
            key={index}
            aria-hidden
            className="pointer-events-none absolute rounded-full shadow-[0_0_0_1.5px_var(--pass)]"
            style={{ inset: -(4 + index * 4), opacity: 0.75 - index * 0.2 }}
          />
        ))}
        <span
          className={cn(
            "grid size-5 place-items-center rounded-full",
            endpoint.type === "proxy" || endpoint.type === "dynamicProxy"
              ? "bg-route-soft text-route"
              : "bg-surface-3 text-ink-1",
          )}
        >
          <TypeGlyph type={endpoint.type} className="size-3" />
        </span>
        {!compact && (
          <>
            <span
              className={cn("font-mono text-xs text-ink-1", status === "disabled" && "line-through decoration-ink-4")}
            >
              {node.segment}
            </span>
            <StatusDot status={status} className="size-1.5" />
            {zoom > 1.1 && (
              <span className="flex items-center gap-1 text-2xs text-ink-3">
                {endpoint.name}
                {groupNames.length > 0 && (
                  <span className="flex items-center gap-0.5 text-pass">
                    <Lock className="size-2.5" />
                    {groupNames.join(" · ")}
                  </span>
                )}
              </span>
            )}
          </>
        )}
        <Handle type="target" position={Position.Top} className={hidden} />
        <Handle type="source" position={Position.Bottom} className={hidden} />
      </motion.button>
    </Tooltip>
  );
}

function HostNode({ data }: NodeProps<Node<HostData>>) {
  const zoom = useZoom();
  return (
    <div className="flex items-center gap-1 rounded-sm bg-route-soft px-2 py-0.5 font-mono text-2xs whitespace-nowrap text-route shadow-[0_0_0_1px_color-mix(in_srgb,var(--route)_35%,transparent)]">
      ↗ {zoom < 0.55 ? data.host.split(".").slice(-2).join(".") : data.host}
      <Handle type="target" position={Position.Top} className={hidden} />
    </div>
  );
}

function MapControls() {
  const flow = useReactFlow();
  const zoom = useZoom();
  const buttons = [
    { label: "放大", icon: Plus, run: () => flow.zoomIn({ duration: 200 }) },
    { label: "缩小", icon: Minus, run: () => flow.zoomOut({ duration: 200 }) },
    { label: "适应画布", icon: Maximize, run: () => flow.fitView({ padding: 0.18, duration: 300 }) },
  ];
  return (
    <div className="absolute top-3 right-3 flex items-center gap-0.5 rounded-md p-0.5 glass shadow-pop">
      {buttons.map(({ label, icon: Icon, run }) => (
        <Tooltip key={label} content={label}>
          <button
            type="button"
            aria-label={label}
            onClick={() => void run()}
            className="grid size-7 place-items-center rounded-sm text-ink-3 hover:bg-surface-3 hover:text-ink-1"
          >
            <Icon className="size-3.5" />
          </button>
        </Tooltip>
      ))}
      <span className="w-11 text-center font-mono text-2xs text-ink-4">{Math.round(zoom * 100)}%</span>
    </div>
  );
}

function Legend() {
  const { data: groups = [] } = useGroups();
  const { highlightGroup, setHighlightGroup } = useWorkspace();
  return (
    <div className="absolute top-3 left-3 grid max-w-56 gap-2 rounded-md p-3 text-2xs text-ink-3 glass shadow-pop">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5">
          <StatusDot status="live" className="size-1.5" /> 在线
        </span>
        <span className="flex items-center gap-1.5">
          <StatusDot status="draft" className="size-1.5" /> 草稿
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full shadow-[0_0_0_1.5px_var(--pass)]" /> 受保护
        </span>
        <span className="flex items-center gap-1.5 text-route">↗ 上游</span>
      </div>
      {groups.length > 0 && (
        <div className="grid gap-1 border-t border-line pt-2">
          <span className="text-ink-4">悬停权限组以透视</span>
          <div className="flex flex-wrap gap-1">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onMouseEnter={() => setHighlightGroup(group.id)}
                onMouseLeave={() => setHighlightGroup(null)}
                onFocus={() => setHighlightGroup(group.id)}
                onBlur={() => setHighlightGroup(null)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-pass shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--pass)_40%,transparent)]",
                  highlightGroup === group.id && "bg-pass-soft",
                )}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
