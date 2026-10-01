import { Ban, ChevronRight, Copy, Eye, EyeOff, KeyRound, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { AccessKey, PermissionGroup } from "../../../../common/types";
import { Page, PageHeader } from "../../app/Page";
import { useRegisterCommands } from "../../app/commands";
import { TypeGlyph } from "../../design/glyphs";
import { glide } from "../../design/motion";
import { errorMessage } from "../../lib/api";
import { absoluteTime, maskKey, relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { useConfirm } from "../../ui/confirm";
import { copyText } from "../../ui/copy-button";
import { Dialog, DialogContent, DialogFooter } from "../../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Field } from "../../ui/field";
import { Input, Textarea } from "../../ui/input";
import { Segmented } from "../../ui/segmented";
import { Skeleton, Spinner } from "../../ui/skeleton";
import { toast } from "../../ui/toaster";
import { statusOf } from "../endpoints/model";
import { StatusDot } from "../endpoints/status";
import { IssueForm } from "../share/SharePanel";
import {
  useCreateGroup,
  useDeleteGroup,
  useDeleteKey,
  useGroupEndpoints,
  useGroupKeys,
  useGroups,
  useRevokeKey,
  useUpdateGroup,
} from "./api";
import { keyStatus, keyStatusLabel, type KeyStatus } from "./keyStatus";

export function AccessPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { data: groups, isLoading } = useGroups();
  const [creating, setCreating] = useState(false);

  // Default to the first group on wide screens; phones start at the list.
  useEffect(() => {
    if (!groupId && groups?.length && window.matchMedia("(min-width: 1024px)").matches) {
      navigate(`/app/access/${groups[0].id}`, { replace: true });
    }
  }, [groupId, groups, navigate]);

  const selected = groups?.find((group) => group.id === groupId);

  useRegisterCommands("access", [
    { id: "access:new-group", group: "访问", label: "新建权限组", icon: Plus, run: () => setCreating(true) },
    ...(groups ?? []).map((group) => ({
      id: `access:group:${group.id}`,
      group: "跳转到权限组",
      label: group.name,
      hint: group.description ?? undefined,
      icon: Users,
      run: () => navigate(`/app/access/${group.id}`),
    })),
  ]);

  return (
    <Page className="max-w-7xl">
      <PageHeader
        eyebrow="访问控制"
        title="权限组与通行卡"
        description="受保护的端点只接受所关联权限组签发的通行卡。把通行卡交给需要的人，随时可以吊销。"
        actions={
          <Button variant="pass" onClick={() => setCreating(true)}>
            <Plus /> 新建权限组
          </Button>
        }
      />
      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      ) : !groups?.length ? (
        <EmptyGroups onCreate={() => setCreating(true)} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <nav aria-label="权限组" className={cn("grid gap-2", groupId && "hidden lg:grid")}>
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} selected={group.id === groupId} />
            ))}
          </nav>
          {selected ? (
            <GroupDetail key={selected.id} group={selected} />
          ) : groupId ? (
            <p className="text-sm text-ink-3">权限组不存在或已被删除。</p>
          ) : null}
        </div>
      )}
      <CreateGroupDialog open={creating} onOpenChange={setCreating} />
    </Page>
  );
}

function GroupCard({ group, selected }: { group: PermissionGroup; selected: boolean }) {
  const { data: keys } = useGroupKeys(group.id);
  const { data: endpoints } = useGroupEndpoints(group.id);
  const usable = keys?.filter((key) => {
    const status = keyStatus(key);
    return status === "active" || status === "expiring";
  }).length;
  return (
    <Link
      to={`/app/access/${group.id}`}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "group relative grid gap-2 rounded-md p-4 transition-[background-color,box-shadow]",
        selected ? "bg-pass-soft shadow-[inset_0_0_0_1px_var(--pass)]" : "bg-surface-1 shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-ink-1">{group.name}</span>
        <ChevronRight className={cn("size-4 shrink-0 text-ink-4 transition-transform", selected && "translate-x-0.5 text-pass")} />
      </div>
      {group.description && <p className="line-clamp-2 text-xs text-ink-3">{group.description}</p>}
      <div className="flex gap-4 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <KeyRound className="size-3.5" /> {usable ?? "–"} 张有效
        </span>
        <span className="flex items-center gap-1.5">
          <TypeGlyph type="static" className="size-3" /> {endpoints?.length ?? "–"} 个端点
        </span>
      </div>
    </Link>
  );
}

function GroupDetail({ group }: { group: PermissionGroup }) {
  const { data: keys, isLoading } = useGroupKeys(group.id);
  const [issuing, setIssuing] = useState(false);
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const [revealed, setRevealed] = useState<AccessKey | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const sorted = useMemo(() => {
    const rank: Record<KeyStatus, number> = { expiring: 0, active: 1, expired: 2, revoked: 3 };
    return [...(keys ?? [])].sort(
      (a, b) => rank[keyStatus(a)] - rank[keyStatus(b)] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [keys]);
  const inactive = sorted.filter((key) => ["expired", "revoked"].includes(keyStatus(key))).length;
  const visible = showInactive ? sorted : sorted.filter((key) => !["expired", "revoked"].includes(keyStatus(key)));

  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={glide} className="grid min-w-0 gap-6">
      <GroupHeader group={group} />

      <div className="rounded-lg bg-surface-0 shadow-[inset_0_0_0_1px_var(--line)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="size-4 text-pass" /> 通行卡
            <span className="text-xs font-normal text-ink-3">{keys?.length ?? 0}</span>
          </h3>
          <div className="flex items-center gap-2">
            <Segmented
              label="布局"
              size="sm"
              value={layout}
              onChange={setLayout}
              options={[
                { value: "cards", label: "卡片" },
                { value: "table", label: "表格" },
              ]}
            />
            <Button size="sm" variant="pass" onClick={() => setIssuing(!issuing)} aria-expanded={issuing}>
              <Plus /> 签发通行卡
            </Button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {issuing && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={glide} className="overflow-hidden px-5 pt-4">
              <IssueForm
                groupIds={[group.id]}
                groupName={() => group.name}
                announce={false}
                onIssued={(key) => {
                  setIssuing(false);
                  setRevealed(key);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="p-5">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-36 rounded-md" />
              ))}
            </div>
          ) : !keys?.length ? (
            <p className="py-8 text-center text-sm text-ink-3">还没有通行卡。签发一张，把它交给需要访问的人。</p>
          ) : layout === "cards" ? (
            <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {visible.map((key) => (
                  <PassTile key={key.id} accessKey={key} groupName={group.name} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <KeyTable keys={visible} groupName={group.name} />
          )}
          {inactive > 0 && (
            <button type="button" onClick={() => setShowInactive(!showInactive)} className="mt-4 text-xs text-ink-3 hover:text-ink-1">
              {showInactive ? "隐藏" : "显示"} {inactive} 张已过期或已吊销的通行卡
            </button>
          )}
        </div>
      </div>

      <GroupEndpoints group={group} />
      <KeyReveal accessKey={revealed} groupName={group.name} onClose={() => setRevealed(null)} />
    </motion.section>
  );
}

function GroupHeader({ group }: { group: PermissionGroup }) {
  const update = useUpdateGroup();
  const remove = useDeleteGroup();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { data: endpoints } = useGroupEndpoints(group.id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");

  const save = async () => {
    if (!name.trim()) return toast.error("名称不能为空");
    try {
      await update.mutateAsync({ id: group.id, name: name.trim(), description: description.trim() });
      toast.success("权限组已更新");
      setEditing(false);
    } catch (error) {
      toast.error("保存失败", { description: errorMessage(error) });
    }
  };

  const destroy = async () => {
    const count = endpoints?.length ?? 0;
    const ok = await confirm({
      title: `删除权限组「${group.name}」`,
      description: count
        ? `${count} 个端点引用了这个权限组。删除后组内所有通行卡立即失效，这些端点将不再接受它们。`
        : "组内所有通行卡会一并删除并立即失效。",
      confirmLabel: "删除权限组",
      tone: "danger",
      typeToConfirm: group.name,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(group.id);
      toast.success("权限组已删除");
      navigate("/app/access");
    } catch (error) {
      toast.error("删除失败", { description: errorMessage(error) });
    }
  };

  if (editing) {
    return (
      <div className="grid gap-3 rounded-lg bg-surface-1 p-5 shadow-[inset_0_0_0_1px_var(--line)]">
        <Field label="名称">
          <Input value={name} maxLength={100} autoFocus onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="说明">
          <Textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={update.isPending}>
            保存
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Link to="/app/access" className="mb-2 inline-block text-xs text-ink-3 hover:text-ink-1 lg:hidden">
          ← 全部权限组
        </Link>
        <h2 className="text-lg font-semibold">{group.name}</h2>
        <p className="mt-1 text-sm text-ink-3">{group.description || "没有说明"}</p>
        <p className="mt-2 text-xs text-ink-4">创建于 {absoluteTime(group.createdAt)}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="权限组操作">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil /> 编辑名称与说明
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void copyText(group.id, "权限组 ID 已复制")}>
            <Copy /> 复制 ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem tone="danger" onSelect={() => void destroy()}>
            <Trash2 /> 删除权限组
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const statusTone: Record<KeyStatus, "signal" | "caution" | "neutral" | "danger"> = {
  active: "signal",
  expiring: "caution",
  expired: "neutral",
  revoked: "danger",
};

function useKeyActions(accessKey: AccessKey) {
  const revoke = useRevokeKey();
  const remove = useDeleteKey();
  const confirm = useConfirm();
  return {
    revoke: async () => {
      const ok = await confirm({
        title: "吊销这张通行卡？",
        description: `「${accessKey.description || maskKey(accessKey.keyValue)}」将立即无法访问任何端点。吊销后无法恢复，可以重新签发。`,
        confirmLabel: "吊销",
        tone: "danger",
      });
      if (!ok) return;
      revoke.mutate(accessKey.id, {
        onSuccess: () => toast.success("通行卡已吊销"),
        onError: (error) => toast.error("吊销失败", { description: errorMessage(error) }),
      });
    },
    remove: async () => {
      const ok = await confirm({
        title: "删除这张通行卡？",
        description: "删除后它会立即失效，并且不再出现在列表和使用记录中。",
        confirmLabel: "删除",
        tone: "danger",
      });
      if (!ok) return;
      remove.mutate(accessKey.id, {
        onSuccess: () => toast.success("通行卡已删除"),
        onError: (error) => toast.error("删除失败", { description: errorMessage(error) }),
      });
    },
  };
}

function KeyMenu({ accessKey }: { accessKey: AccessKey }) {
  const actions = useKeyActions(accessKey);
  const status = keyStatus(accessKey);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="通行卡操作">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void copyText(accessKey.keyValue, "密钥已复制")}>
          <Copy /> 复制密钥
        </DropdownMenuItem>
        {status !== "revoked" && (
          <DropdownMenuItem tone="danger" onSelect={() => void actions.revoke()}>
            <Ban /> 吊销
          </DropdownMenuItem>
        )}
        <DropdownMenuItem tone="danger" onSelect={() => void actions.remove()}>
          <Trash2 /> 删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PassTile({ accessKey, groupName }: { accessKey: AccessKey; groupName: string }) {
  const status = keyStatus(accessKey);
  const [shown, setShown] = useState(false);
  const live = status === "active" || status === "expiring";
  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={glide}
      className={cn(
        "relative grid gap-3 overflow-hidden rounded-md p-4",
        live ? "bg-surface-1 shadow-[inset_0_0_0_1px_var(--line-strong)]" : "bg-surface-0 opacity-70 shadow-[inset_0_0_0_1px_var(--line)]",
        status === "expiring" && "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--caution)_55%,transparent)]",
      )}
    >
      {live && <span aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-pass-soft blur-2xl" />}
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink-1">{accessKey.description || "未命名通行卡"}</div>
          <div className="text-2xs text-ink-3">{groupName}</div>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone={statusTone[status]}>{keyStatusLabel[status]}</Badge>
          <KeyMenu accessKey={accessKey} />
        </div>
      </div>
      <div className="relative flex items-center gap-1 rounded-sm bg-surface-0 py-1 pr-1 pl-2.5 font-mono text-xs shadow-[inset_0_0_0_1px_var(--line)]">
        <span className={cn("min-w-0 flex-1 truncate", shown ? "text-pass" : "text-ink-2")}>{shown ? accessKey.keyValue : maskKey(accessKey.keyValue)}</span>
        <Button size="icon-sm" variant="ghost" aria-label={shown ? "隐藏密钥" : "显示密钥"} onClick={() => setShown(!shown)}>
          {shown ? <EyeOff /> : <Eye />}
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="复制密钥" onClick={() => void copyText(accessKey.keyValue, "密钥已复制")}>
          <Copy />
        </Button>
      </div>
      <dl className="relative grid grid-cols-3 gap-2 text-2xs">
        <Stat label="有效期" value={accessKey.expiresAt ? (status === "expired" ? "已过期" : `${relativeTime(accessKey.expiresAt)}`) : "永久"} tone={status === "expiring" ? "caution" : undefined} />
        <Stat label="使用" value={`${accessKey.usageCount} 次`} />
        <Stat label="最近使用" value={accessKey.lastUsedAt ? relativeTime(accessKey.lastUsedAt) : "从未"} />
      </dl>
    </motion.article>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "caution" }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-4">{label}</dt>
      <dd className={cn("truncate text-ink-2", tone === "caution" && "text-caution")}>{value}</dd>
    </div>
  );
}

function KeyTable({ keys, groupName }: { keys: AccessKey[]; groupName: string }) {
  return (
    <div className="scrollbar-thin -mx-5 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-2xs tracking-wide text-ink-4 uppercase">
          <tr className="border-b border-line">
            <th className="px-5 py-2 font-medium">备注</th>
            <th className="py-2 font-medium">密钥</th>
            <th className="py-2 font-medium">状态</th>
            <th className="py-2 font-medium">到期</th>
            <th className="py-2 text-right font-medium">使用</th>
            <th className="py-2 font-medium">最近使用</th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const status = keyStatus(key);
            return (
              <tr key={key.id} className="border-b border-line last:border-0 hover:bg-surface-1">
                <td className="px-5 py-2.5">
                  <div className="text-ink-1">{key.description || "未命名"}</div>
                  <div className="text-2xs text-ink-4">{groupName}</div>
                </td>
                <td className="py-2.5 font-mono text-xs text-ink-2">{maskKey(key.keyValue)}</td>
                <td className="py-2.5">
                  <Badge tone={statusTone[status]}>{keyStatusLabel[status]}</Badge>
                </td>
                <td className="py-2.5 text-xs text-ink-3">{key.expiresAt ? absoluteTime(key.expiresAt) : "永久"}</td>
                <td className="py-2.5 text-right font-mono text-xs text-ink-2">{key.usageCount}</td>
                <td className="py-2.5 pl-4 text-xs text-ink-3">{key.lastUsedAt ? relativeTime(key.lastUsedAt) : "从未"}</td>
                <td className="py-2.5 pr-3">
                  <KeyMenu accessKey={key} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupEndpoints({ group }: { group: PermissionGroup }) {
  const { data: endpoints, isLoading } = useGroupEndpoints(group.id);
  return (
    <div className="rounded-lg bg-surface-0 shadow-[inset_0_0_0_1px_var(--line)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          引用它的端点 <span className="text-xs font-normal text-ink-3">{endpoints?.length ?? 0}</span>
        </h3>
        <Link to="/app/endpoints" className="text-xs text-ink-3 hover:text-ink-1">
          打开端点 →
        </Link>
      </div>
      {isLoading ? (
        <div className="p-5">
          <Skeleton className="h-8" />
        </div>
      ) : !endpoints?.length ? (
        <p className="px-5 py-6 text-sm text-ink-3">还没有端点使用这个权限组。在端点的「设置」中把它设为受保护并选择本组。</p>
      ) : (
        <ul className="divide-y divide-line">
          {endpoints.map((endpoint) => (
            <li key={endpoint.id}>
              <Link
                to={`/app/endpoints${endpoint.path}`}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-1"
              >
                <TypeGlyph type={endpoint.type} className="size-4 text-ink-2" />
                <span className="font-mono text-sm text-ink-1">{endpoint.path}</span>
                <span className="truncate text-xs text-ink-3">{endpoint.name}</span>
                <span className="ml-auto flex items-center gap-2">
                  {endpoint.accessControl === "public" && <Badge tone="caution">公开 · 不校验密钥</Badge>}
                  <StatusDot status={statusOf(endpoint)} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shown right after issuing: the full key with the prominent copy action. */
function KeyReveal({ accessKey, groupName, onClose }: { accessKey: AccessKey | null; groupName: string; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    if (!accessKey) return;
    setFlipped(false);
    const timer = setTimeout(() => setFlipped(true), 250);
    return () => clearTimeout(timer);
  }, [accessKey]);
  return (
    <Dialog open={Boolean(accessKey)} onOpenChange={(open) => !open && onClose()}>
      {accessKey && (
        <DialogContent title="通行卡已签发" description={`${groupName} · ${accessKey.description || "未命名通行卡"}`}>
          <div className="[perspective:900px]">
            <motion.div
              animate={{ rotateY: flipped ? 0 : 90 }}
              initial={{ rotateY: 90 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-md p-px"
              style={{ background: "var(--brand-gradient)" }}
            >
              <div className="rounded-[9px] bg-surface-solid p-4">
                <div className="mb-2 text-2xs tracking-[0.2em] text-ink-3">ACCESS KEY</div>
                <code className="block font-mono text-sm break-all text-pass">{accessKey.keyValue}</code>
              </div>
            </motion.div>
          </div>
          <p className="text-xs text-ink-3">
            把密钥交给对方，通过 <code className="font-mono">X-Access-Key</code> 请求头或 <code className="font-mono">access_key</code> 参数访问。也可以在端点的「分享」中生成带二维码的通行卡。
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              完成
            </Button>
            <Button variant="pass" onClick={() => void copyText(accessKey.keyValue, "密钥已复制")}>
              <Copy /> 复制密钥
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateGroup();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim()) return;
    try {
      const group = await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      toast.success("权限组已创建");
      onOpenChange(false);
      navigate(`/app/access/${group.id}`);
    } catch (error) {
      toast.error("创建失败", { description: errorMessage(error) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="新建权限组" description="权限组是一类访问者，例如「付费用户」或「团队成员」。">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Field label="名称">
            <Input autoFocus value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="VIP 客户" />
          </Field>
          <Field label="说明" hint="可选">
            <Textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" variant="pass" disabled={!name.trim() || create.isPending}>
              {create.isPending && <Spinner className="text-current" />} 创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmptyGroups({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-lg py-20 text-center shadow-[inset_0_0_0_1px_var(--line)]">
      <div className="relative mb-6 grid size-16 place-items-center">
        <span className="absolute inset-0 rounded-full shadow-[0_0_0_1.5px_var(--pass)]" />
        <span className="absolute -inset-2 rounded-full opacity-50 shadow-[0_0_0_1.5px_var(--pass)]" />
        <KeyRound className="size-6 text-pass" />
      </div>
      <h2 className="font-semibold">还没有权限组</h2>
      <p className="mt-2 max-w-sm text-sm text-ink-3">创建一个权限组，签发通行卡，再把端点设为受保护，只有持卡人才能访问。</p>
      <Button className="mt-6" variant="pass" onClick={onCreate}>
        <Plus /> 新建权限组
      </Button>
    </div>
  );
}
