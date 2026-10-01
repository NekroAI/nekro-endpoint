import {
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Rocket,
  Settings2,
  Share2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { DirectoryGlyph, TypeGlyph, typeMeta } from "../../design/glyphs";
import { glide, ignite } from "../../design/motion";
import { errorMessage } from "../../lib/api";
import { cn } from "../../lib/cn";
import { useHotkey } from "../../lib/hotkeys";
import { buildEndpointAccessUrl } from "../../utils/endpointShare";
import { Button } from "../../ui/button";
import { useConfirm } from "../../ui/confirm";
import { copyText } from "../../ui/copy-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Skeleton } from "../../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { toast } from "../../ui/toaster";
import { Tooltip } from "../../ui/tooltip";
import { SharePanel } from "../share/SharePanel";
import { useDeleteEndpoint, useEndpointDetail, useSetPublished, useUpdateEndpoint } from "./api";
import { ContentTab } from "./editors/ContentTab";
import { normalizePath, statusOf, validatePath, type EndpointView } from "./model";
import type { NamespaceNode } from "./namespace";
import { SettingsTab } from "./SettingsTab";
import { StatusDot, StatusPill } from "./status";
import { publicOrigin, useWorkspace, type SheetTab } from "./workspace";

export function FocusSheet() {
  const { selectedNode, selectedPath, select } = useWorkspace();
  useHotkey("escape", () => void select(""), Boolean(selectedPath));

  if (!selectedNode || !selectedPath) return null;
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-solid">
      {selectedNode.endpoint && !selectedNode.endpoint.ghost ? (
        <EndpointSheet listed={selectedNode.endpoint} />
      ) : (
        <DirectoryPanel node={selectedNode} />
      )}
    </div>
  );
}

function CloseButton() {
  const { select } = useWorkspace();
  return (
    <Tooltip content="关闭 (Esc)">
      <Button size="icon-sm" variant="ghost" aria-label="关闭" onClick={() => void select("")}>
        <X />
      </Button>
    </Tooltip>
  );
}

function EndpointSheet({ listed }: { listed: EndpointView }) {
  const { data: detail } = useEndpointDetail(listed.id);
  // Detail is the freshest copy; the list entry renders instantly meanwhile.
  const endpoint = detail && detail.id === listed.id ? { ...detail, isPublished: listed.isPublished } : listed;
  const { tab, setTab } = useWorkspace();

  return (
    <>
      <SheetHeader endpoint={endpoint} />
      <Tabs value={tab} onValueChange={(value) => setTab(value as SheetTab)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center border-b border-line px-4">
          <TabsList>
            <TabsTrigger value="content">
              <Code2 /> 内容
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings2 /> 设置
            </TabsTrigger>
            <TabsTrigger value="share">
              <Share2 /> 分享
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="content" className="min-h-0 flex-1">
          {detail ? <ContentTab endpoint={endpoint} /> : <EditorPlaceholder />}
        </TabsContent>
        <TabsContent value="settings" className="min-h-0 flex-1">
          <SettingsTab endpoint={endpoint} />
        </TabsContent>
        <TabsContent value="share" className="min-h-0 flex-1">
          <SharePanel endpoint={endpoint} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function EditorPlaceholder() {
  return (
    <div className="grid gap-2 p-6">
      {[60, 80, 40, 70].map((width, index) => (
        <Skeleton key={index} className="h-3" style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}

function SheetHeader({ endpoint }: { endpoint: EndpointView }) {
  const status = statusOf(endpoint);
  const [igniteKey, setIgniteKey] = useState(0);
  return (
    <header className="shrink-0 border-b border-line px-5 pt-4 pb-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative grid size-10 shrink-0 place-items-center rounded-md shadow-[inset_0_0_0_1px_var(--line-strong)]",
            endpoint.type === "proxy" || endpoint.type === "dynamicProxy" ? "bg-route-soft text-route" : "bg-surface-2 text-ink-1",
          )}
        >
          <TypeGlyph type={endpoint.type} className="size-[18px]" />
          <StatusDot status={status} className="absolute -right-0.5 -bottom-0.5 size-2.5 shadow-[0_0_0_2px_var(--surface-solid)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-md font-semibold text-ink-1">{endpoint.name}</h2>
            <span className="relative">
              <StatusPill status={status} />
              <AnimatePresence>{igniteKey > 0 && <IgniteBurst key={igniteKey} />}</AnimatePresence>
            </span>
            <span className="hidden text-xs text-ink-4 sm:inline">{typeMeta[endpoint.type].label}</span>
          </div>
          <AddressLine endpoint={endpoint} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <PublishControl endpoint={endpoint} onIgnite={() => setIgniteKey((key) => key + 1)} />
          <MoreMenu endpoint={endpoint} />
          <CloseButton />
        </div>
      </div>
    </header>
  );
}

/** One-shot confirmation that the endpoint just went live (docs/REDESIGN.md §2.6 ignite). */
function IgniteBurst() {
  return (
    <>
      {[0, 0.12].map((delay) => (
        <motion.span
          key={delay}
          aria-hidden
          initial={{ opacity: 0.9, scale: 0.6 }}
          animate={{ opacity: 0, scale: 2.6 }}
          exit={{ opacity: 0 }}
          transition={{ ...ignite, delay }}
          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_2px_var(--signal),0_0_24px_var(--signal)]"
        />
      ))}
    </>
  );
}

function AddressLine({ endpoint }: { endpoint: EndpointView }) {
  const { username, endpoints, select, tab } = useWorkspace();
  const update = useUpdateEndpoint();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(endpoint.path.slice(1));
  const input = useRef<HTMLInputElement>(null);
  const host = typeof window === "undefined" ? "" : window.location.host;

  useEffect(() => {
    setDraft(endpoint.path.slice(1));
    setEditing(false);
  }, [endpoint.id, endpoint.path]);
  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  const normalized = normalizePath(draft);
  const error = normalized === endpoint.path ? null : validatePath(normalized, (path) => endpoints.some((other) => other.path === path && other.id !== endpoint.id));

  const commit = async () => {
    if (normalized === endpoint.path) return setEditing(false);
    if (error) return;
    if (endpoint.isPublished) {
      const ok = await confirm({
        title: "修改已发布端点的地址？",
        description: (
          <>
            旧地址 <code className="font-mono text-ink-1">{endpoint.path}</code> 会立即失效，已经分发出去的链接和二维码将无法访问。
          </>
        ),
        confirmLabel: "修改地址",
        tone: "danger",
      });
      if (!ok) return;
    }
    try {
      await update.mutateAsync({ id: endpoint.id, path: normalized });
      toast.success("地址已更新");
      setEditing(false);
      await select(normalized, tab);
    } catch (caught) {
      toast.error("修改失败", { description: errorMessage(caught) });
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      // Keep this keystroke from also activating the confirmation dialog it opens.
      event.preventDefault();
      void commit();
    }
    if (event.key === "Escape") {
      event.stopPropagation();
      setDraft(endpoint.path.slice(1));
      setEditing(false);
    }
  };

  const segments = endpoint.path.split("/").filter(Boolean);

  return (
    <div className="mt-1.5">
      {editing ? (
        <div>
          <div
            className={cn(
              "flex min-w-0 items-center rounded-sm bg-surface-1 font-mono text-sm shadow-[inset_0_0_0_1px_var(--signal),0_0_0_3px_var(--signal-soft)]",
              error && "shadow-[inset_0_0_0_1px_var(--danger),0_0_0_3px_var(--danger-soft)]",
            )}
          >
            <span className="shrink-0 pl-2.5 text-ink-4">/e/{username}/</span>
            <input
              ref={input}
              aria-label="端点路径"
              aria-invalid={Boolean(error)}
              value={draft}
              onChange={(event) => setDraft(event.target.value.replace(/^\/+/, ""))}
              onKeyDown={onKeyDown}
              onBlur={() => !error && normalized === endpoint.path && setEditing(false)}
              className="h-8 min-w-0 flex-1 bg-transparent pr-2 text-ink-1 outline-none"
            />
            <Button size="sm" variant="primary" className="mr-1 h-6" disabled={Boolean(error) || update.isPending} onMouseDown={(event) => event.preventDefault()} onClick={() => void commit()}>
              保存
            </Button>
          </div>
          <p className={cn("mt-1 text-xs", error ? "text-danger" : "text-ink-4")}>{error ?? "Enter 保存 · Esc 取消"}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group flex max-w-full min-w-0 items-center gap-0.5 rounded-sm py-0.5 text-left font-mono text-sm"
          aria-label={`编辑路径 ${endpoint.path}`}
        >
          <span className="hidden shrink-0 text-ink-4 lg:inline">{host}</span>
          <span className="shrink-0 text-ink-4">/e/{username}</span>
          {segments.map((segment, index) => (
            <span key={index} className="flex min-w-0 items-center">
              <span className="text-ink-4">/</span>
              <span className={cn("truncate", index === segments.length - 1 ? "text-ink-1" : "text-ink-2")}>{segment}</span>
            </span>
          ))}
          <Pencil className="ml-1.5 size-3 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </button>
      )}
    </div>
  );
}

function PublishControl({ endpoint, onIgnite }: { endpoint: EndpointView; onIgnite: () => void }) {
  const { user } = useAuth();
  const publish = useSetPublished();
  const update = useUpdateEndpoint();

  if (!endpoint.enabled) {
    return (
      <Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => update.mutate({ id: endpoint.id, enabled: true }, { onSuccess: () => toast.success("已启用") })}>
        <Power /> <span className="sr-only sm:not-sr-only">启用</span>
      </Button>
    );
  }

  const run = (next: boolean) =>
    publish.mutate(
      { id: endpoint.id, publish: next },
      {
        onSuccess: () => {
          if (next) {
            onIgnite();
            toast.success("已发布到边缘", { description: `/e/${user?.username}${endpoint.path}` });
          } else toast.success("已取消发布");
        },
        onError: (error) => toast.error(next ? "发布失败" : "取消发布失败", { description: errorMessage(error) }),
      },
    );

  if (endpoint.isPublished) {
    return (
      <Button size="sm" variant="ghost" disabled={publish.isPending} onClick={() => run(false)}>
        <Undo2 /> <span className="sr-only sm:not-sr-only">取消发布</span>
      </Button>
    );
  }
  return (
    <Tooltip content={user?.isActivated ? null : "账号需要管理员激活后才能发布"}>
      <span>
        <Button size="sm" variant="primary" disabled={!user?.isActivated || publish.isPending} onClick={() => run(true)}>
          <Rocket /> <span className="sr-only sm:not-sr-only">发布</span>
        </Button>
      </span>
    </Tooltip>
  );
}

function MoreMenu({ endpoint }: { endpoint: EndpointView }) {
  const { username, select, openCreate } = useWorkspace();
  const update = useUpdateEndpoint();
  const remove = useDeleteEndpoint();
  const confirm = useConfirm();
  const url = buildEndpointAccessUrl(publicOrigin(), username, endpoint.path);

  const destroy = async () => {
    const ok = await confirm({
      title: "删除端点",
      description: endpoint.isPublished ? "这个端点正在线上提供服务。删除后所有已分发的链接立即失效，且无法恢复。" : "删除后无法恢复。",
      confirmLabel: "永久删除",
      tone: "danger",
      typeToConfirm: endpoint.path,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(endpoint.id);
      toast.success("端点已删除");
      await select("");
    } catch (error) {
      toast.error("删除失败", { description: errorMessage(error) });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="更多操作">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void copyText(url, "地址已复制")}>
          <Copy /> 复制地址
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.open(url, "_blank", "noopener")}>
          <ExternalLink /> 在新标签页打开
        </DropdownMenuItem>
        {endpoint.type !== "dynamicProxy" && (
          <DropdownMenuItem onSelect={() => openCreate(`${endpoint.path}/`)}>
            <Plus /> 在此路径下新建
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => update.mutate({ id: endpoint.id, enabled: !endpoint.enabled }, { onSuccess: () => toast.success(endpoint.enabled ? "已停用" : "已启用") })}>
          <Power /> {endpoint.enabled ? "停用" : "启用"}
        </DropdownMenuItem>
        <DropdownMenuItem tone="danger" onSelect={() => void destroy()}>
          <Trash2 /> 删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DirectoryPanel({ node }: { node: NamespaceNode }) {
  const { username, select, openCreate } = useWorkspace();
  const children = node.children;
  return (
    <>
      <header className="flex shrink-0 items-start gap-3 border-b border-line px-5 py-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-ink-3 shadow-[inset_0_0_0_1px_var(--line-strong)]">
          <DirectoryGlyph className="size-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-md font-semibold">目录</h2>
          <div className="mt-1.5 truncate font-mono text-sm text-ink-2">
            <span className="text-ink-4">/e/{username}</span>
            {node.path}/
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => openCreate(`${node.path}/`)}>
          <Plus /> 在此新建
        </Button>
        <CloseButton />
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3 pb-28">
        <p className="px-2 pb-3 text-xs text-ink-3">
          目录由路径自动形成，本身不是端点。下面是 {node.path}/ 下的 {node.count} 个端点。
        </p>
        <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03 } } }} className="grid gap-1">
          {children.map((child) => (
            <motion.li key={child.path} variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: glide } }}>
              <button
                type="button"
                onClick={() => void select(child.path)}
                className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left hover:bg-surface-2"
              >
                {child.endpoint ? <TypeGlyph type={child.endpoint.type} className="size-4 text-ink-2" /> : <DirectoryGlyph className="size-4 text-ink-4" />}
                <span className="font-mono text-sm text-ink-1">{child.segment}</span>
                <span className="truncate text-xs text-ink-3">{child.endpoint?.name ?? `${child.count} 个端点`}</span>
                <span className="ml-auto flex items-center gap-2">
                  {child.endpoint && <StatusDot status={statusOf(child.endpoint)} />}
                  <ChevronRight className="size-4 text-ink-4" />
                </span>
              </button>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </>
  );
}
