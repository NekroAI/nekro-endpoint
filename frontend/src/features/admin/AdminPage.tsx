import { ArrowLeft, Lock, MoreHorizontal, Search, ShieldCheck, Trash2, Undo2, X } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { useDeferredValue, useMemo, useState } from "react";
import { useHotkey } from "../../lib/hotkeys";
import { Navigate } from "react-router-dom";
import type { StaticConfig, ScriptConfig } from "../../../../common/types";
import { Page, PageHeader } from "../../app/Page";
import { useAuth } from "../../hooks/useAuth";
import { CodeEditor, languageForContentType } from "../../design/code-editor";
import { DirectoryGlyph, TypeGlyph, typeMeta } from "../../design/glyphs";
import { glide } from "../../design/motion";
import { errorMessage } from "../../lib/api";
import { absoluteTime, relativeTime } from "../../lib/format";
import { spotlight } from "../../lib/spotlight";
import { CountUp } from "../../ui/count-up";
import { cn } from "../../lib/cn";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { useConfirm } from "../../ui/confirm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../ui/dropdown-menu";
import { Segmented } from "../../ui/segmented";
import { Skeleton } from "../../ui/skeleton";
import { Switch } from "../../ui/switch";
import { toast } from "../../ui/toaster";
import { statusOf, type EndpointView } from "../endpoints/model";
import { buildNamespace, type NamespaceNode } from "../endpoints/namespace";
import { StatusDot, StatusPill } from "../endpoints/status";
import { AdminRequests } from "../activation/AdminRequests";
import {
  useAdminStats,
  useAdminUserEndpoints,
  useAdminUsers,
  useDeleteUser,
  useForceUnpublish,
  useSetActivation,
  type AdminUser,
} from "./api";

export function AdminPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/app/endpoints" replace />;
  return <Admin />;
}

function Admin() {
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const [activated, setActivated] = useState<"all" | "true" | "false">("all");
  const { data, isLoading } = useAdminUsers(deferred, activated);
  const [reviewing, setReviewing] = useState<AdminUser | null>(null);

  return (
    <Page className="max-w-7xl">
      <PageHeader
        eyebrow="管理"
        title="用户与审查"
        description="激活新用户以允许他们发布端点；必要时审查任何用户的端点内容并强制下线。"
      />
      <Stats />
      <AdminRequests />

      <section className="mt-6 rounded-lg bg-surface-0 shadow-[inset_0_0_0_1px_var(--line)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <h2 className="mr-auto text-sm font-medium">用户</h2>
          <label className="flex h-8 w-56 items-center gap-2 rounded-sm bg-surface-1 px-2.5 shadow-[inset_0_0_0_1px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_1px_var(--signal)]">
            <Search className="size-3.5 text-ink-3" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="用户名或邮箱"
              aria-label="搜索用户"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-4"
            />
          </label>
          <Segmented
            label="激活状态"
            size="sm"
            value={activated}
            onChange={setActivated}
            options={[
              { value: "all", label: "全部" },
              { value: "false", label: "待激活" },
              { value: "true", label: "已激活" },
            ]}
          />
        </div>
        {isLoading ? (
          <div className="grid gap-2 p-5">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-10" />
            ))}
          </div>
        ) : !data?.users.length ? (
          <p className="px-5 py-8 text-center text-sm text-ink-3">没有匹配的用户</p>
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-2xs tracking-wide text-ink-4 uppercase">
                <tr className="border-b border-line">
                  <th className="px-5 py-2 font-medium">用户</th>
                  <th className="py-2 font-medium">角色</th>
                  <th className="py-2 font-medium">可以发布</th>
                  <th className="py-2 font-medium">最近登录</th>
                  <th className="py-2 font-medium">加入于</th>
                  <th className="w-36" />
                </tr>
              </thead>
              <tbody>
                {data.users.map((member) => (
                  <UserRow key={member.id} member={member} onReview={() => setReviewing(member)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {reviewing && <ReviewSheet key={reviewing.id} member={reviewing} onClose={() => setReviewing(null)} />}
      </AnimatePresence>
    </Page>
  );
}

function Stats() {
  const { data } = useAdminStats();
  const tiles: [string, number | undefined, string][] = [
    ["用户", data?.totalUsers, `${data?.activatedUsers ?? "–"} 已激活`],
    ["端点", data?.totalEndpoints, `${data?.publishedEndpoints ?? "–"} 已发布`],
    ["权限组", data?.totalPermissionGroups, "全平台"],
    ["通行卡", data?.totalAccessKeys, "全平台"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map(([label, value, hint]) => (
        <div
          key={label}
          {...spotlight}
          className="spotlight rounded-lg bg-surface-0 p-4 shadow-[inset_0_0_0_1px_var(--line)]"
        >
          <div className="text-xs text-ink-3">{label}</div>
          <div className="mt-1 font-mono text-xl font-semibold text-ink-1 tabular-nums">
            {value === undefined ? "–" : <CountUp value={value} />}
          </div>
          <div className="mt-0.5 text-2xs text-ink-4">{hint}</div>
        </div>
      ))}
    </div>
  );
}

function UserRow({ member, onReview }: { member: AdminUser; onReview: () => void }) {
  const { user: me } = useAuth();
  const activation = useSetActivation();
  const remove = useDeleteUser();
  const confirm = useConfirm();
  const isSelf = member.id === me?.id;

  const toggle = async (activate: boolean) => {
    if (!activate) {
      const ok = await confirm({
        title: `停用 ${member.username}？`,
        description: "停用后对方无法再发布端点，已发布的端点也会因所有者未激活而返回 403。",
        confirmLabel: "停用",
        tone: "danger",
      });
      if (!ok) return;
    }
    activation.mutate(
      { id: member.id, activate },
      {
        onSuccess: () => toast.success(activate ? `已激活 ${member.username}` : `已停用 ${member.username}`),
        onError: (error) => toast.error("操作失败", { description: errorMessage(error) }),
      },
    );
  };

  const destroy = async () => {
    const ok = await confirm({
      title: `删除用户 ${member.username}`,
      description: "该用户的端点、权限组和通行卡会一并删除，所有链接立即失效。此操作不可撤销。",
      confirmLabel: "永久删除",
      tone: "danger",
      typeToConfirm: member.username,
    });
    if (!ok) return;
    remove.mutate(member.id, {
      onSuccess: () => toast.success("用户已删除"),
      onError: (error) => toast.error("删除失败", { description: errorMessage(error) }),
    });
  };

  return (
    <tr className="border-b border-line last:border-0 hover:bg-surface-1">
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 text-xs font-semibold text-ink-2">
            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              member.username[0]?.toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <div className="truncate text-ink-1">
              {member.username}
              {isSelf && <span className="ml-1.5 text-2xs text-ink-4">（你）</span>}
            </div>
            <div className="truncate text-xs text-ink-3">{member.email ?? "—"}</div>
          </div>
        </div>
      </td>
      <td className="py-2.5">{member.role === "admin" ? <Badge tone="pass">管理员</Badge> : <Badge>用户</Badge>}</td>
      <td className="py-2.5">
        <Switch
          checked={member.isActivated}
          disabled={isSelf || activation.isPending}
          onCheckedChange={(checked) => void toggle(checked)}
          aria-label={`${member.username} 的激活状态`}
        />
      </td>
      <td className="py-2.5 text-xs text-ink-3">{member.lastLoginAt ? relativeTime(member.lastLoginAt) : "—"}</td>
      <td className="py-2.5 text-xs text-ink-3">{absoluteTime(member.createdAt)}</td>
      <td className="py-2.5 pr-4">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={onReview}>
            审查端点
          </Button>
          {!isSelf && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label={`${member.username} 的更多操作`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem tone="danger" onSelect={() => void destroy()}>
                  <Trash2 /> 删除用户
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </td>
    </tr>
  );
}

/** Read-only review of another user's namespace, with force-unpublish. */
function ReviewSheet({ member, onClose }: { member: AdminUser; onClose: () => void }) {
  const { data: endpoints, isLoading } = useAdminUserEndpoints(member.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const namespace = useMemo(() => buildNamespace(endpoints ?? []), [endpoints]);
  const selected = endpoints?.find((endpoint) => endpoint.id === selectedId);
  useHotkey("escape", () => (selectedId ? setSelectedId(null) : onClose()));

  const rows: { node: NamespaceNode; depth: number }[] = [];
  const walk = (node: NamespaceNode, depth: number) =>
    node.children.forEach((child) => {
      rows.push({ node: child, depth });
      walk(child, depth + 1);
    });
  walk(namespace, 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-[rgb(0_0_0/0.4)]"
        onClick={onClose}
      />
      <motion.aside
        role="dialog"
        aria-label={`${member.username} 的端点`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={glide}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-4xl flex-col bg-surface-solid shadow-float"
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          {selected ? (
            <Button size="icon-sm" variant="ghost" aria-label="返回列表" onClick={() => setSelectedId(null)}>
              <ArrowLeft />
            </Button>
          ) : (
            <ShieldCheck className="size-5 text-pass" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">审查 {member.username}</h2>
            <p className="font-mono text-xs text-ink-3">/e/{member.username} · 只读</p>
          </div>
          <Button size="icon-sm" variant="ghost" aria-label="关闭" onClick={onClose}>
            <X />
          </Button>
        </header>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid gap-2 p-5">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-9" />
              ))}
            </div>
          ) : selected ? (
            <ReviewDetail endpoint={selected} username={member.username} />
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-3">该用户还没有端点。</p>
          ) : (
            <ul className="p-3">
              {rows.map(({ node, depth }) => (
                <li key={node.path}>
                  <button
                    type="button"
                    disabled={!node.endpoint}
                    onClick={() => node.endpoint && setSelectedId(node.endpoint.id)}
                    className="flex h-10 w-full items-center gap-2 rounded-sm pr-3 text-left enabled:hover:bg-surface-2"
                    style={{ paddingLeft: 12 + depth * 20 }}
                  >
                    {node.endpoint ? (
                      <TypeGlyph type={node.endpoint.type} className="size-4 text-ink-2" />
                    ) : (
                      <DirectoryGlyph className="size-4 text-ink-4" />
                    )}
                    <span className={cn("font-mono text-sm", node.endpoint ? "text-ink-1" : "text-ink-3")}>
                      {node.segment}
                      {!node.endpoint && "/"}
                    </span>
                    {node.endpoint && <span className="truncate text-xs text-ink-3">{node.endpoint.name}</span>}
                    {node.endpoint && (
                      <span className="ml-auto flex items-center gap-2">
                        {node.endpoint.accessControl === "authenticated" && <Lock className="size-3 text-pass" />}
                        <StatusDot status={statusOf(node.endpoint)} />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.aside>
    </>
  );
}

function ReviewDetail({ endpoint, username }: { endpoint: EndpointView; username: string }) {
  const force = useForceUnpublish();
  const confirm = useConfirm();
  const [live, setLive] = useState(endpoint.isPublished);

  const unpublish = async () => {
    const ok = await confirm({
      title: "强制下线这个端点？",
      description: `/e/${username}${endpoint.path} 会立即停止对外服务。所有者可以重新发布。`,
      confirmLabel: "强制下线",
      tone: "danger",
    });
    if (!ok) return;
    force.mutate(endpoint.id, {
      onSuccess: () => {
        setLive(false);
        toast.success("已强制下线");
      },
      onError: (error) => toast.error("操作失败", { description: errorMessage(error) }),
    });
  };

  const isText = endpoint.type === "static" || endpoint.type === "script";
  const text =
    endpoint.type === "static"
      ? (endpoint.config as StaticConfig).content
      : endpoint.type === "script"
        ? (endpoint.config as ScriptConfig).code
        : JSON.stringify(endpoint.config, null, 2);
  const language =
    endpoint.type === "static"
      ? languageForContentType((endpoint.config as StaticConfig).contentType ?? "")
      : endpoint.type === "script"
        ? "javascript"
        : "json";

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <TypeGlyph type={endpoint.type} className="size-4 text-ink-2" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{endpoint.name}</div>
          <div className="font-mono text-xs text-ink-3">
            /e/{username}
            {endpoint.path} · {typeMeta[endpoint.type].label}
          </div>
        </div>
        <StatusPill status={statusOf({ ...endpoint, isPublished: live })} />
        {live && (
          <Button size="sm" variant="danger" onClick={() => void unpublish()} disabled={force.isPending}>
            <Undo2 /> 强制下线
          </Button>
        )}
      </div>
      <div className="h-[60vh] min-h-80">
        <CodeEditor value={text ?? ""} language={isText ? language : "json"} readOnly ariaLabel="端点内容（只读）" />
      </div>
    </div>
  );
}
