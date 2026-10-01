import { Check, CircleAlert, Cpu, History, Plug, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { errorMessage } from "../../lib/api";
import { relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { useConfirm } from "../../ui/confirm";
import { CopyButton } from "../../ui/copy-button";
import { Field } from "../../ui/field";
import { Input } from "../../ui/input";
import { Segmented } from "../../ui/segmented";
import { Spinner } from "../../ui/skeleton";
import { toast } from "../../ui/toaster";
import {
  PROVIDERS,
  useAgentActions,
  useDeleteConfig,
  useSaveConfig,
  useSignalConfig,
  useTestConfig,
  type AiConfigView,
  type AiProvider,
  type AiTestResult,
} from "./api";
import { metaOf } from "./tools";

function Section({ id, title, description, icon, children }: { id?: string; title: string; description?: ReactNode; icon: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 rounded-lg bg-surface-0 shadow-[inset_0_0_0_1px_var(--line)]">
      <header className="border-b border-line px-6 py-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-ink-3">{description}</p>}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

/** Settings for Signal Line: the user's model, the platform default (admins) and recent tool calls. */
export function SignalSettings() {
  const { user } = useAuth();
  const { data: config, isLoading } = useSignalConfig();
  const actions = useAgentActions(Boolean(config?.available));

  useEffect(() => {
    if (window.location.hash === "#signal") document.getElementById("signal")?.scrollIntoView({ behavior: "smooth" });
  }, [isLoading]);

  return (
    <>
      <Section
        id="signal"
        title="Signal 智能助手"
        icon={<Sparkles className="size-4 text-signal" />}
        description="接入你自己的模型后，底部输入条可以直接用自然语言管理端点。所有写入、发布和删除都需要你逐项确认；密钥不会发送给模型。"
      >
        {isLoading ? (
          <Spinner />
        ) : !config?.available ? (
          <p className="flex items-start gap-2 rounded-sm bg-caution-soft px-3 py-2.5 text-sm text-caution">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            服务端尚未启用 Signal：管理员需要为 Worker 设置 AI_CONFIG_SECRET（例如 wrangler secret put AI_CONFIG_SECRET）。
          </p>
        ) : (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-3">当前使用</span>
              {config.active === "user" ? (
                <Badge tone="signal">我的模型 · {config.user?.model}</Badge>
              ) : config.active === "platform" ? (
                <Badge tone="pass">平台默认 · {config.platform?.model}</Badge>
              ) : (
                <Badge tone="caution">未配置</Badge>
              )}
            </div>
            <ModelForm scope="user" saved={config.user} />
          </div>
        )}
      </Section>

      {config?.available && user?.role === "admin" && (
        <Section
          title="平台默认模型"
          icon={<Cpu className="size-4 text-pass" />}
          description="没有配置自己模型的用户会使用这里的模型。仅管理员可见。"
        >
          <ModelForm scope="platform" saved={config.platform} />
        </Section>
      )}

      <McpSection />

      {config?.available && (
        <Section title="最近的工具调用" icon={<History className="size-4 text-ink-3" />} description="Signal 与 MCP 客户端代你执行的操作。输入已脱敏。">
          {!actions.data?.length ? (
            <p className="text-sm text-ink-3">还没有记录。</p>
          ) : (
            <ul className="divide-y divide-line">
              {actions.data.slice(0, 12).map((action) => (
                <li key={action.id} className="flex items-center gap-3 py-2 text-sm">
                  {action.ok ? <Check className="size-3.5 text-signal" /> : <X className="size-3.5 text-danger" />}
                  <span className="text-ink-1">{metaOf(action.tool).title}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-3" title={action.message ?? action.input}>
                    {action.message ?? action.input}
                  </span>
                  <Badge tone={action.source === "mcp" ? "pass" : "neutral"}>{action.source === "mcp" ? "MCP" : "Signal"}</Badge>
                  <span className="w-16 shrink-0 text-right text-xs text-ink-4">{relativeTime(action.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </>
  );
}

function ModelForm({ scope, saved }: { scope: "user" | "platform"; saved: AiConfigView | null }) {
  const save = useSaveConfig(scope);
  const remove = useDeleteConfig(scope);
  const test = useTestConfig();
  const confirm = useConfirm();
  const [provider, setProvider] = useState<AiProvider>(saved?.provider ?? "anthropic");
  const [model, setModel] = useState(saved?.model ?? PROVIDERS.anthropic.models[0]);
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState<AiTestResult | null>(null);

  useEffect(() => {
    if (!saved) return;
    setProvider(saved.provider);
    setModel(saved.model);
    setBaseUrl(saved.baseUrl ?? "");
  }, [saved?.provider, saved?.model, saved?.baseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = PROVIDERS[provider];
  const draft = { provider, model: model.trim(), baseUrl: baseUrl.trim() || null, apiKey: apiKey.trim() || undefined };
  const incomplete = !draft.model || (meta.needsBaseUrl && !draft.baseUrl) || (!saved && !draft.apiKey);
  const listId = `${scope}-models`;

  const onSave = async () => {
    try {
      await save.mutateAsync(draft);
      setApiKey("");
      toast.success(scope === "user" ? "模型配置已保存" : "平台默认模型已保存");
    } catch (error) {
      toast.error("保存失败", { description: errorMessage(error) });
    }
  };
  const onTest = async () => {
    setResult(null);
    try {
      setResult(await test.mutateAsync(scope === "user" ? draft : undefined));
    } catch (error) {
      setResult({ ok: false, toolCalling: false, latencyMs: 0, message: errorMessage(error) });
    }
  };
  const onDelete = async () => {
    if (!(await confirm({ title: "删除模型配置？", description: "API Key 会被一并删除。", confirmLabel: "删除", tone: "danger" }))) return;
    remove.mutate(undefined, { onSuccess: () => toast.success("已删除") });
  };

  return (
    <div className="grid gap-4">
      <Segmented<AiProvider>
        label="模型服务商"
        value={provider}
        onChange={(next) => {
          setProvider(next);
          if (!PROVIDERS[next].models.includes(model)) setModel(PROVIDERS[next].models[0]);
        }}
        className="w-full max-w-lg"
        options={(Object.keys(PROVIDERS) as AiProvider[]).map((key) => ({ value: key, label: PROVIDERS[key].label }))}
      />
      <p className="-mt-2 text-xs text-ink-4">{meta.hint}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="模型">
          <Input mono list={listId} value={model} onChange={(event) => setModel(event.target.value)} />
        </Field>
        <datalist id={listId}>
          {meta.models.map((candidate) => (
            <option key={candidate} value={candidate} />
          ))}
        </datalist>
        <Field label="API Key" hint={saved?.keyHint ? `已保存 ${saved.keyHint}，留空则沿用` : "只会加密保存在服务端"}>
          <Input mono type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={saved?.keyHint ?? "sk-…"} />
        </Field>
        <Field label="Base URL" hint={meta.needsBaseUrl ? "必填，例如 https://api.deepseek.com/v1" : "可选，使用代理网关时填写"} className="md:col-span-2">
          <Input mono value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://" />
        </Field>
      </div>
      {result && (
        <p className={cn("flex items-center gap-2 rounded-sm px-3 py-2 text-sm", result.ok && result.toolCalling ? "bg-signal-soft text-signal" : result.ok ? "bg-caution-soft text-caution" : "bg-danger-soft text-danger")}>
          {result.ok ? <Check className="size-4 shrink-0" /> : <X className="size-4 shrink-0" />}
          {result.message}
          {result.latencyMs > 0 && <span className="ml-auto font-mono text-xs opacity-70">{result.latencyMs} ms</span>}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {saved ? (
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => void onDelete()}>
            <Trash2 /> 删除配置
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => void onTest()} disabled={test.isPending || (scope === "user" && incomplete && !saved)}>
            {test.isPending && <Spinner className="text-current" />} 测试连接
          </Button>
          <Button size="sm" variant="primary" onClick={() => void onSave()} disabled={incomplete || save.isPending}>
            {save.isPending && <Spinner className="text-current" />} 保存
          </Button>
        </div>
      </div>
    </div>
  );
}

function McpSection() {
  const { user } = useAuth();
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/mcp`;
  const [client, setClient] = useState<"generic" | "cli">("generic");
  const masked = user ? `${user.apiKey.slice(0, 8)}…` : "sec-…";
  const config = (key: string) =>
    client === "generic"
      ? JSON.stringify({ mcpServers: { endpoints: { type: "http", url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2)
      : `claude mcp add --transport http endpoints ${url} \\\n  --header "Authorization: Bearer ${key}"`;

  return (
    <Section
      title="MCP 接入"
      icon={<Plug className="size-4 text-ink-3" />}
      description="任何支持 MCP（Streamable HTTP）的客户端都可以用你的管理密钥连接，获得与 Signal 相同的工具。写入类工具会标注为需要确认。"
    >
      <div className="grid gap-3">
        <div className="flex min-w-0 items-center gap-1 rounded-sm bg-surface-1 py-1 pr-1 pl-3 shadow-[inset_0_0_0_1px_var(--line-strong)]">
          <code className="min-w-0 flex-1 truncate font-mono text-sm">{url}</code>
          <CopyButton value={url} label="复制地址" />
        </div>
        <Segmented
          label="客户端"
          size="sm"
          value={client}
          onChange={setClient}
          className="w-fit"
          options={[
            { value: "generic", label: "JSON 配置" },
            { value: "cli", label: "Claude Code" },
          ]}
        />
        <div className="relative">
          <pre className="scrollbar-thin overflow-x-auto rounded-md bg-surface-1 p-3 pr-12 font-mono text-xs leading-relaxed shadow-[inset_0_0_0_1px_var(--line)]">
            {config(masked)}
          </pre>
          {user && <CopyButton value={config(user.apiKey)} label="复制（含完整管理密钥）" className="absolute top-2 right-2" />}
        </div>
        <p className="text-xs text-ink-4">复制的内容包含你的管理密钥，只粘贴到你信任的客户端中。重新生成管理密钥后需要同步更新。</p>
      </div>
    </Section>
  );
}
