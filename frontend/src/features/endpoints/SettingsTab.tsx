import { Check, Globe, Lock, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGroups } from "../access/api";
import { useDeleteEndpoint, useUpdateEndpoint } from "./api";
import type { EndpointView } from "./model";
import { useWorkspace } from "./workspace";
import { FormSection } from "./editors/FormSection";
import { TypeGlyph, typeMeta } from "../../design/glyphs";
import { errorMessage } from "../../lib/api";
import { absoluteTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/button";
import { Field } from "../../ui/field";
import { Input } from "../../ui/input";
import { Segmented } from "../../ui/segmented";
import { Switch } from "../../ui/switch";
import { toast } from "../../ui/toaster";
import { useConfirm } from "../../ui/confirm";
import { CopyButton } from "../../ui/copy-button";

export function SettingsTab({ endpoint }: { endpoint: EndpointView }) {
  const update = useUpdateEndpoint();
  const remove = useDeleteEndpoint();
  const confirm = useConfirm();
  const { select } = useWorkspace();
  const { data: groups = [] } = useGroups();
  const [name, setName] = useState(endpoint.name);
  useEffect(() => setName(endpoint.name), [endpoint.id, endpoint.name]);

  const patch = async (input: Parameters<typeof update.mutateAsync>[0], success: string) => {
    try {
      await update.mutateAsync(input);
      toast.success(success);
    } catch (error) {
      toast.error("保存失败", { description: errorMessage(error) });
    }
  };

  const saveName = () => {
    const next = name.trim();
    if (!next || next === endpoint.name) return setName(endpoint.name);
    if (next.length > 100) return toast.error("名称最长 100 个字符");
    void patch({ id: endpoint.id, name: next }, "名称已更新");
  };

  const setAccess = (accessControl: EndpointView["accessControl"]) => {
    if (accessControl === endpoint.accessControl) return;
    const nextGroups = accessControl === "authenticated" ? endpoint.groups : [];
    void patch(
      { id: endpoint.id, accessControl, requiredPermissionGroups: nextGroups },
      accessControl === "public" ? "已设为公开访问" : "已设为受保护",
    );
  };

  const toggleGroup = (id: string) => {
    const next = endpoint.groups.includes(id) ? endpoint.groups.filter((group) => group !== id) : [...endpoint.groups, id];
    void patch({ id: endpoint.id, accessControl: "authenticated", requiredPermissionGroups: next }, "权限组已更新");
  };

  const setEnabled = async (enabled: boolean) => {
    if (!enabled && endpoint.isPublished) {
      const ok = await confirm({
        title: "停用这个端点？",
        description: "停用后访问会返回 503，发布状态会保留。随时可以重新启用。",
        confirmLabel: "停用",
        tone: "danger",
      });
      if (!ok) return;
    }
    void patch({ id: endpoint.id, enabled }, enabled ? "已启用" : "已停用");
  };

  const destroy = async () => {
    const ok = await confirm({
      title: "删除端点",
      description: endpoint.isPublished
        ? "这个端点正在线上提供服务。删除后所有已分发的链接立即失效，且无法恢复。"
        : "删除后无法恢复。",
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

  const protectedWithoutGroups = endpoint.accessControl === "authenticated" && endpoint.groups.length === 0;

  return (
    <div className="scrollbar-thin h-full overflow-y-auto pb-28">
      <FormSection title="基本信息" description="名称只在控制台中显示；对外暴露的是地址。修改地址请点击顶部的路径。">
        <Field label="名称">
          <Input
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
            onKeyDown={(event) => event.key === "Enter" && (event.currentTarget as HTMLInputElement).blur()}
          />
        </Field>
        <div className="flex items-center gap-3 rounded-sm bg-surface-1 px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--line)]">
          <TypeGlyph type={endpoint.type} className="size-4 text-ink-2" />
          <div className="min-w-0">
            <div className="text-sm text-ink-1">{typeMeta[endpoint.type].label}端点</div>
            <div className="text-xs text-ink-3">{typeMeta[endpoint.type].summary}</div>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="访问控制"
        description={
          <>
            受保护的端点需要携带所属权限组的通行卡访问：<code className="font-mono">X-Access-Key</code> 请求头或{" "}
            <code className="font-mono">access_key</code> 参数。
          </>
        }
      >
        <Segmented
          label="访问控制"
          value={endpoint.accessControl}
          onChange={setAccess}
          className="w-full max-w-sm"
          options={[
            { value: "public", label: "公开", icon: <Globe /> },
            { value: "authenticated", label: "受保护", icon: <Lock /> },
          ]}
        />
        {endpoint.accessControl === "authenticated" && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-2">允许访问的权限组</span>
              <Link to="/app/access" className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-pass">
                <Plus className="size-3" /> 管理权限组
              </Link>
            </div>
            {groups.length === 0 ? (
              <p className="rounded-sm bg-caution-soft px-3 py-2 text-xs text-caution">
                还没有权限组。先在「访问」中创建一个，再回来关联。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => {
                  const on = endpoint.groups.includes(group.id);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleGroup(group.id)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-[background-color,box-shadow,color]",
                        on
                          ? "bg-pass-soft text-pass shadow-[inset_0_0_0_1px_var(--pass)]"
                          : "text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2",
                      )}
                    >
                      {on ? <Check className="size-3.5" /> : <Lock className="size-3.5 text-ink-4" />}
                      {group.name}
                    </button>
                  );
                })}
              </div>
            )}
            {protectedWithoutGroups && (
              <p className="text-xs text-caution">至少选择一个权限组，否则访问会返回 500（No permission groups configured）。</p>
            )}
          </div>
        )}
      </FormSection>

      <FormSection title="可用性" description="停用会让访问立即返回 503，但保留发布状态，适合临时下线。">
        <label className="flex items-center justify-between gap-4 rounded-sm bg-surface-1 px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--line)]">
          <span>
            <span className="block text-sm text-ink-1">{endpoint.enabled ? "已启用" : "已停用"}</span>
            <span className="block text-xs text-ink-3">{endpoint.enabled ? "访问按发布状态正常处理" : "访问返回 503 Endpoint disabled"}</span>
          </span>
          <Switch checked={endpoint.enabled} onCheckedChange={(enabled) => void setEnabled(enabled)} aria-label="启用端点" />
        </label>
      </FormSection>

      <FormSection title="元数据">
        <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-3">ID</dt>
          <dd className="flex min-w-0 items-center gap-1 font-mono text-xs text-ink-2">
            <span className="truncate">{endpoint.id}</span>
            <CopyButton value={endpoint.id} label="复制 ID" />
          </dd>
          <dt className="text-ink-3">创建于</dt>
          <dd className="text-ink-2">{absoluteTime(endpoint.createdAt)}</dd>
          <dt className="text-ink-3">更新于</dt>
          <dd className="text-ink-2">{absoluteTime(endpoint.updatedAt)}</dd>
        </dl>
      </FormSection>

      <FormSection title="危险操作" description="删除不可恢复。如果只是想暂时下线，可以取消发布或停用。">
        <div>
          <Button variant="danger" onClick={() => void destroy()} disabled={remove.isPending}>
            <Trash2 /> 删除端点
          </Button>
        </div>
      </FormSection>
    </div>
  );
}
