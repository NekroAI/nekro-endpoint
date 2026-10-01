import { CalendarClock, Download, ExternalLink, KeyRound, Link2, Plus, RefreshCw, Rocket, Power } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { AccessKey } from "../../../../common/types";
import { buildEndpointAccessUrl, isShareableAccessKey } from "../../utils/endpointShare";
import { useGroups, useIssueKey, useKeysForGroups } from "../access/api";
import { useSetPublished, useUpdateEndpoint } from "../endpoints/api";
import type { EndpointView } from "../endpoints/model";
import { publicOrigin, useWorkspace } from "../endpoints/workspace";
import { useAuth } from "../../hooks/useAuth";
import { errorMessage } from "../../lib/api";
import { relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/button";
import { CopyButton } from "../../ui/copy-button";
import { Field } from "../../ui/field";
import { Input } from "../../ui/input";
import { Segmented } from "../../ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../../ui/select";
import { Spinner } from "../../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { toast } from "../../ui/toaster";
import { AccessPass, downloadPass, type PassInfo } from "./AccessPass";
import { glide } from "../../design/motion";

/**
 * One place for everything a recipient needs: URL, pass, QR and call
 * examples. Replaces the old copy menu + key picker + QR dialogs.
 */
export function SharePanel({ endpoint }: { endpoint: EndpointView }) {
  const { username } = useWorkspace();
  const origin = publicOrigin();
  const baseUrl = useMemo(() => buildEndpointAccessUrl(origin, username, endpoint.path), [origin, username, endpoint.path]);
  const isProtected = endpoint.accessControl === "authenticated";

  return (
    <div className="scrollbar-thin h-full overflow-y-auto pb-28">
      <Availability endpoint={endpoint} />
      <section className="border-b border-line px-6 py-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-2">
          <Link2 className="size-3.5" /> 访问地址
        </div>
        <UrlRow url={baseUrl} />
        {isProtected && <p className="mt-2 text-xs text-ink-3">受保护端点：单独的地址无法访问，需要配合下面的通行卡。</p>}
      </section>
      {isProtected ? <ProtectedShare endpoint={endpoint} baseUrl={baseUrl} /> : <PublicShare endpoint={endpoint} url={baseUrl} />}
    </div>
  );
}

function Availability({ endpoint }: { endpoint: EndpointView }) {
  const { user } = useAuth();
  const publish = useSetPublished();
  const update = useUpdateEndpoint();
  if (endpoint.isPublished && endpoint.enabled) return null;
  const reason = !endpoint.enabled ? "端点已停用，访问会返回 503。" : "端点还是草稿，访问会返回 404。发布后链接和二维码才会生效。";
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-caution-soft px-6 py-3 text-sm text-caution">
      <span className="flex-1">{reason}</span>
      {!endpoint.enabled ? (
        <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: endpoint.id, enabled: true })} disabled={update.isPending}>
          <Power /> 启用
        </Button>
      ) : (
        <Button
          size="sm"
          variant="primary"
          disabled={!user?.isActivated || publish.isPending}
          onClick={() =>
            publish.mutate(
              { id: endpoint.id, publish: true },
              { onError: (error) => toast.error("发布失败", { description: errorMessage(error) }) },
            )
          }
        >
          <Rocket /> {user?.isActivated ? "发布" : "需要管理员激活"}
        </Button>
      )}
    </div>
  );
}

function UrlRow({ url, secret }: { url: string; secret?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-1 rounded-sm bg-surface-1 py-1 pr-1 pl-3 shadow-[inset_0_0_0_1px_var(--line-strong)]">
      <span className={cn("min-w-0 flex-1 truncate font-mono text-sm", secret ? "text-pass" : "text-ink-1")} title={url}>
        {url}
      </span>
      <CopyButton value={url} label={secret ? "复制带密钥的链接" : "复制链接"} />
      <Button asChild size="icon-sm" variant="ghost" aria-label="在新标签页打开">
        <a href={url} target="_blank" rel="noreferrer noopener">
          <ExternalLink />
        </a>
      </Button>
    </div>
  );
}

function PublicShare({ endpoint, url }: { endpoint: EndpointView; url: string }) {
  const { username } = useWorkspace();
  const [flipped, setFlipped] = useState(false);
  const info: PassInfo = { url, path: endpoint.path, username };
  return (
    <>
      <PassSection info={info} flipped={flipped} setFlipped={setFlipped} />
      <Examples url={url} />
    </>
  );
}

function ProtectedShare({ endpoint, baseUrl }: { endpoint: EndpointView; baseUrl: string }) {
  const { username } = useWorkspace();
  const { data: groups = [] } = useGroups();
  const { keys, isLoading } = useKeysForGroups(endpoint.groups);
  const usable = useMemo(() => keys.filter((key) => isShareableAccessKey(key, endpoint.groups)), [keys, endpoint.groups]);
  const unusable = keys.length - usable.length;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!usable.some((key) => key.id === selectedId)) setSelectedId(usable[0]?.id ?? null);
  }, [usable, selectedId]);

  const selected = usable.find((key) => key.id === selectedId);
  const groupName = (id: string) => groups.find((group) => group.id === id)?.name ?? "未知组";

  if (endpoint.groups.length === 0) {
    return (
      <section className="px-6 py-6 text-sm text-caution">
        这个端点受保护，但还没有关联任何权限组，因此没有人能访问。请先在「设置」中选择权限组。
      </section>
    );
  }

  const url = selected ? buildEndpointAccessUrl(publicOrigin(), username, endpoint.path, selected.keyValue) : baseUrl;
  const info: PassInfo | null = selected
    ? {
        url,
        path: endpoint.path,
        username,
        keyValue: selected.keyValue,
        groupName: groupName(selected.permissionGroupId),
        note: selected.description,
        expiresAt: selected.expiresAt,
      }
    : null;

  return (
    <>
      <section className="border-b border-line px-6 py-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-ink-2">
            <KeyRound className="size-3.5" /> 选择通行卡
          </div>
          <Button size="sm" variant="ghost" onClick={() => setIssuing(!issuing)} aria-expanded={issuing}>
            <Plus /> 签发新通行卡
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {issuing && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={glide} className="overflow-hidden">
              <IssueForm
                groupIds={endpoint.groups}
                groupName={groupName}
                onIssued={(key) => {
                  setIssuing(false);
                  setSelectedId(key.id);
                  setFlipped(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-ink-3">
            <Spinner /> 正在读取通行卡…
          </div>
        ) : usable.length === 0 ? (
          <p className="rounded-sm bg-surface-1 px-3 py-3 text-sm text-ink-3 shadow-[inset_0_0_0_1px_var(--line)]">
            关联的权限组里还没有有效的通行卡。签发一张就能分享这个端点。
          </p>
        ) : (
          <div role="radiogroup" aria-label="通行卡" className="grid gap-1.5">
            {usable.map((key) => (
              <KeyOption key={key.id} accessKey={key} groupName={groupName(key.permissionGroupId)} selected={key.id === selectedId} onSelect={() => setSelectedId(key.id)} />
            ))}
          </div>
        )}
        {unusable > 0 && <p className="mt-2 text-xs text-ink-4">另有 {unusable} 张已过期或已吊销的通行卡未列出。</p>}
      </section>
      {info && (
        <>
          <section className="border-b border-line px-6 py-5">
            <div className="mb-2 text-xs font-medium text-ink-2">带密钥的链接</div>
            <UrlRow url={url} secret />
            <p className="mt-2 text-xs text-ink-3">任何拿到这个链接的人都能访问。只发给你信任的人；需要收回时，在「访问」中吊销这张通行卡。</p>
          </section>
          <PassSection info={info} flipped={flipped} setFlipped={setFlipped} />
          <Examples url={url} accessKey={info.keyValue} />
        </>
      )}
    </>
  );
}

function KeyOption({ accessKey, groupName, selected, onSelect }: { accessKey: AccessKey; groupName: string; selected: boolean; onSelect: () => void }) {
  const expiresSoon = accessKey.expiresAt && new Date(accessKey.expiresAt).getTime() - Date.now() < 7 * 86_400_000;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-md px-3 py-2.5 text-left transition-[background-color,box-shadow]",
        selected ? "bg-pass-soft shadow-[inset_0_0_0_1px_var(--pass)]" : "bg-surface-1 shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2",
      )}
    >
      <span className={cn("grid size-4 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_1.5px_var(--ink-4)]", selected && "shadow-[inset_0_0_0_1.5px_var(--pass)]")}>
        {selected && <span className="size-2 rounded-full bg-pass" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink-1">{accessKey.description || "未命名通行卡"}</span>
        <span className="block truncate text-xs text-ink-3">
          {groupName} · <span className="font-mono">•••• {accessKey.keyValue.slice(-4)}</span> · 已使用 {accessKey.usageCount} 次
        </span>
      </span>
      <span className={cn("shrink-0 text-xs", expiresSoon ? "text-caution" : "text-ink-4")}>
        {accessKey.expiresAt ? `${relativeTime(accessKey.expiresAt)}到期` : "永久有效"}
      </span>
    </button>
  );
}

const EXPIRY_PRESETS = [
  { value: "7", label: "7 天" },
  { value: "30", label: "30 天" },
  { value: "90", label: "90 天" },
  { value: "never", label: "永久" },
] as const;

export function IssueForm({
  groupIds,
  groupName,
  onIssued,
}: {
  groupIds: string[];
  groupName: (id: string) => string;
  onIssued: (key: AccessKey) => void;
}) {
  const issue = useIssueKey();
  const [groupId, setGroupId] = useState(groupIds[0]);
  const [note, setNote] = useState("");
  const [expiry, setExpiry] = useState<(typeof EXPIRY_PRESETS)[number]["value"]>("30");

  const submit = async () => {
    try {
      const expiresAt = expiry === "never" ? undefined : new Date(Date.now() + Number(expiry) * 86_400_000).toISOString();
      const key = await issue.mutateAsync({ groupId, description: note.trim() || undefined, expiresAt });
      toast.success("通行卡已签发");
      onIssued(key);
    } catch (error) {
      toast.error("签发失败", { description: errorMessage(error) });
    }
  };

  return (
    <div className="mb-3 grid gap-3 rounded-md bg-surface-1 p-3 shadow-[inset_0_0_0_1px_var(--line)]">
      <div className="grid gap-3 sm:grid-cols-2">
        {groupIds.length > 1 && (
          <Field label="权限组">
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>{groupName(groupId)}</SelectTrigger>
              <SelectContent>
                {groupIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    {groupName(id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="备注" hint="例如：给谁、用在哪里">
          <Input value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="小王的手机" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-ink-3" />
          <Segmented label="有效期" size="sm" value={expiry} onChange={setExpiry} options={EXPIRY_PRESETS.map((preset) => ({ ...preset }))} />
        </div>
        <Button size="sm" variant="pass" onClick={() => void submit()} disabled={issue.isPending}>
          {issue.isPending && <Spinner className="text-current" />} 签发
        </Button>
      </div>
    </div>
  );
}

function PassSection({ info, flipped, setFlipped }: { info: PassInfo; flipped: boolean; setFlipped: (value: boolean) => void }) {
  const [downloading, setDownloading] = useState(false);
  return (
    <section className="border-b border-line px-6 py-6">
      <AccessPass info={info} flipped={flipped} onFlip={() => setFlipped(!flipped)} />
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setFlipped(!flipped)}>
          <RefreshCw /> 翻面
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={downloading}
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadPass(info);
            } catch (error) {
              toast.error("生成图片失败", { description: errorMessage(error) });
            } finally {
              setDownloading(false);
            }
          }}
        >
          <Download /> 下载卡片
        </Button>
      </div>
    </section>
  );
}

function Examples({ url, accessKey }: { url: string; accessKey?: string }) {
  const [form, setForm] = useState<"header" | "query">("header");
  const clean = (() => {
    const parsed = new URL(url);
    parsed.searchParams.delete("access_key");
    return parsed.toString();
  })();
  const header = accessKey ? `curl -H "X-Access-Key: ${accessKey}" \\\n  "${clean}"` : `curl "${clean}"`;
  const query = `curl "${url}"`;
  return (
    <section className="px-6 py-5">
      <Tabs value={form} onValueChange={(value) => setForm(value as typeof form)}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-ink-2">调用示例</span>
          {accessKey && (
            <TabsList>
              <TabsTrigger value="header" className="h-6 text-xs">
                请求头
              </TabsTrigger>
              <TabsTrigger value="query" className="h-6 text-xs">
                查询参数
              </TabsTrigger>
            </TabsList>
          )}
        </div>
        {(["header", "query"] as const).map((variant) => (
          <TabsContent key={variant} value={variant}>
            <div className="group relative">
              <pre className="scrollbar-thin overflow-x-auto rounded-md bg-surface-1 p-3 pr-12 font-mono text-xs leading-relaxed text-ink-1 shadow-[inset_0_0_0_1px_var(--line)]">
                {variant === "header" ? header : query}
              </pre>
              <CopyButton value={variant === "header" ? header : query} label="复制命令" className="absolute top-2 right-2" />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
