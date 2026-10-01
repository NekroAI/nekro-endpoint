import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { EndpointType } from "../../../../common/types";
import { useAuth } from "../../hooks/useAuth";
import { useConfirm } from "../../ui/confirm";
import { safeLocalStorage } from "../../utils/storage";
import { useEndpointList } from "./api";
import { statusOf, type EndpointStatus, type EndpointView } from "./model";
import { buildNamespace, findNode, type NamespaceNode } from "./namespace";
import { useOptionalSignal } from "../signal/SignalProvider";
import type { Ghost } from "../signal/tools";

export type ViewMode = "map" | "list";
export type SheetTab = "content" | "settings" | "share";
export type Filters = { query: string; statuses: EndpointStatus[]; types: EndpointType[]; group: string | null };

const EMPTY_FILTERS: Filters = { query: "", statuses: [], types: [], group: null };
const VIEW_KEY = "signal.endpoints.view";
const BASE = "/app/endpoints";

type Workspace = {
  username: string;
  endpoints: EndpointView[];
  namespace: NamespaceNode;
  visible: (endpoint: EndpointView) => boolean;
  isLoading: boolean;
  error: unknown;

  /** Path of the selected namespace node ("" = root). */
  selectedPath: string;
  selectedNode: NamespaceNode | undefined;
  selectedEndpoint: EndpointView | undefined;
  select: (path: string, tab?: SheetTab) => Promise<boolean>;
  tab: SheetTab;
  setTab: (tab: SheetTab) => void;

  view: ViewMode;
  setView: (view: ViewMode) => void;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  filtersActive: boolean;

  setDirty: (dirty: boolean) => void;
  createPrefix: string | null;
  openCreate: (prefix?: string) => void;
  closeCreate: () => void;
  highlightGroup: string | null;
  setHighlightGroup: (group: string | null) => void;
  /** Pending Signal changes to existing endpoints, by path. */
  ghostKinds: Map<string, Ghost["kind"]>;
};

const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}

function matches(endpoint: EndpointView, filters: Filters) {
  const query = filters.query.trim().toLowerCase();
  if (query && !`${endpoint.path} ${endpoint.name}`.toLowerCase().includes(query)) return false;
  if (filters.statuses.length && !filters.statuses.includes(statusOf(endpoint))) return false;
  if (filters.types.length && !filters.types.includes(endpoint.type)) return false;
  if (filters.group && !endpoint.groups.includes(filters.group)) return false;
  return true;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data, isLoading, error } = useEndpointList();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const confirm = useConfirm();

  const endpoints = useMemo(() => data ?? [], [data]);
  const signal = useOptionalSignal();
  const ghosts = signal?.ghosts;

  // Planned endpoints appear in the namespace as ghosts until they are created.
  const ghostKinds = useMemo(() => new Map((ghosts ?? []).filter((ghost) => ghost.kind !== "create").map((ghost) => [ghost.path, ghost.kind])), [ghosts]);
  const namespace = useMemo(() => {
    const planned = (ghosts ?? [])
      .filter((ghost) => ghost.kind === "create" && !endpoints.some((endpoint) => endpoint.path === ghost.path))
      .map(
        (ghost): EndpointView => ({
          id: `ghost:${ghost.path}`,
          path: ghost.path,
          name: "待创建",
          type: "static",
          config: { content: "", contentType: "text/plain" },
          accessControl: "public",
          groups: [],
          enabled: true,
          isPublished: false,
          sortOrder: Number.MAX_SAFE_INTEGER,
          parentId: null,
          createdAt: "",
          updatedAt: "",
          ghost: "create",
        }),
      );
    return buildNamespace([...endpoints, ...planned]);
  }, [endpoints, ghosts]);

  // The URL is the source of truth for the selection: /app/endpoints/<path>.
  const selectedPath = useMemo(() => {
    const rest = decodeURIComponent(location.pathname.slice(BASE.length));
    return rest && rest !== "/" ? rest.replace(/\/$/, "") : "";
  }, [location.pathname]);
  const selectedNode = findNode(namespace, selectedPath);
  const selectedEndpoint = selectedNode?.endpoint?.ghost ? undefined : selectedNode?.endpoint;

  // Tell Signal what the user is looking at, so "this endpoint" resolves.
  const setSignalContext = signal?.setContext;
  useEffect(() => {
    setSignalContext?.({ path: selectedEndpoint?.path, page: "端点" });
  }, [setSignalContext, selectedEndpoint?.path]);
  const tab = (params.get("tab") as SheetTab | null) ?? "content";

  const dirty = useRef(false);
  const setDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);
  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const select = useCallback(
    async (path: string, nextTab?: SheetTab) => {
      if (path === selectedPath && !nextTab) return true;
      if (dirty.current && path !== selectedPath) {
        const discard = await confirm({
          title: "放弃未保存的修改？",
          description: "当前端点有尚未保存的内容修改，离开后这些修改会丢失。",
          confirmLabel: "放弃修改",
          tone: "danger",
        });
        if (!discard) return false;
        dirty.current = false;
      }
      const encoded = path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      const search = nextTab && nextTab !== "content" ? `?tab=${nextTab}` : "";
      navigate(`${BASE}${encoded}${search}`);
      return true;
    },
    [confirm, navigate, selectedPath],
  );

  const setTab = useCallback(
    (next: SheetTab) => {
      setParams(
        (current) => {
          const copy = new URLSearchParams(current);
          if (next === "content") copy.delete("tab");
          else copy.set("tab", next);
          return copy;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const [view, setViewState] = useState<ViewMode>("list");
  useEffect(() => {
    const stored = safeLocalStorage.getItem(VIEW_KEY);
    if (stored === "map" || stored === "list") setViewState(stored);
  }, []);
  const setView = useCallback((next: ViewMode) => {
    setViewState(next);
    safeLocalStorage.setItem(VIEW_KEY, next);
  }, []);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const filtersActive = Boolean(filters.query || filters.statuses.length || filters.types.length || filters.group);
  const visible = useCallback((endpoint: EndpointView) => matches(endpoint, filters), [filters]);

  const [createPrefix, setCreatePrefix] = useState<string | null>(null);
  const [highlightGroup, setHighlightGroup] = useState<string | null>(null);

  const value: Workspace = {
    username: user?.username ?? "",
    endpoints,
    namespace,
    visible,
    isLoading,
    error,
    selectedPath,
    selectedNode,
    selectedEndpoint,
    select,
    tab,
    setTab,
    view,
    setView,
    filters,
    setFilters,
    filtersActive,
    setDirty,
    createPrefix,
    openCreate: (prefix) => setCreatePrefix(prefix ?? ""),
    closeCreate: () => setCreatePrefix(null),
    highlightGroup,
    setHighlightGroup,
    ghostKinds,
  };
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/** The public origin used in shared URLs. */
export function publicOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}
