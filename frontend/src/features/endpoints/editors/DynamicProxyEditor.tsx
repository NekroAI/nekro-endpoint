import { useState } from "react";
import { Ban, CheckCircle2 } from "lucide-react";
import type { DynamicProxyConfig } from "../../../../../common/types";
import { Field } from "../../../ui/field";
import { Input } from "../../../ui/input";
import { KeyValueEditor } from "../../../ui/key-value";
import { Switch } from "../../../ui/switch";
import { TagInput } from "../../../ui/tag-input";
import { FormSection } from "./FormSection";
import { FlowDiagram } from "./FlowDiagram";
import { useWorkspace } from "../workspace";

export function validateDynamicProxy(config: DynamicProxyConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  if (config.baseUrl) {
    try {
      const url = new URL(config.baseUrl);
      if (!["http:", "https:"].includes(url.protocol)) errors.baseUrl = "只支持 http 或 https";
    } catch {
      errors.baseUrl = "请输入完整的 URL，例如 https://raw.githubusercontent.com/";
    }
  }
  if (!Number.isInteger(config.timeout) || config.timeout < 1000 || config.timeout > 30000) errors.timeout = "范围 1000–30000 毫秒";
  return errors;
}

/** Same rules as src/utils/security.ts isPathAllowed. */
function pathAllowed(path: string, patterns: string[]) {
  if (!patterns.length) return true;
  return patterns.some((pattern) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`).test(path));
}

/** Mirrors the execution layer: base (+ slash) + sub-path, query kept minus access_key. */
function resolveTarget(config: DynamicProxyConfig, sample: string) {
  if (!config.baseUrl) return null;
  const [rawPath, query = ""] = sample.split("?");
  const subPath = `/${rawPath.replace(/^\/+/, "")}`
    .split("/")
    .filter((part) => part !== ".." && part !== ".")
    .join("/");
  const base = config.autoAppendSlash && !config.baseUrl.endsWith("/") ? `${config.baseUrl}/` : config.baseUrl;
  try {
    const target = new URL(subPath.replace(/^\//, ""), base);
    new URLSearchParams(query).forEach((value, key) => {
      if (key !== "access_key") target.searchParams.set(key, value);
    });
    return { url: target.toString(), allowed: pathAllowed(subPath || "/", config.allowedPaths ?? []) };
  } catch {
    return null;
  }
}

export function DynamicProxyEditor({ value, onChange }: { value: DynamicProxyConfig; onChange: (value: DynamicProxyConfig) => void }) {
  const { selectedEndpoint, username } = useWorkspace();
  const [sample, setSample] = useState("owner/repo/main/README.md");
  const errors = validateDynamicProxy(value);
  const resolved = resolveTarget(value, sample);
  const prefix = `/e/${username}${selectedEndpoint?.path ?? ""}/`;

  return (
    <div>
      <FlowDiagram from={`${prefix}*`} to={value.baseUrl ? `${value.baseUrl}*` : ""} note="子路径和查询参数会拼接到基础 URL 之后；access_key 参数不会转发" />
      <FormSection title="映射" description="此端点下的每个子路径都映射到基础 URL 下的同名路径。动态代理端点下不能再创建子端点。">
        <Field label="基础 URL" error={errors.baseUrl} hint={!value.baseUrl ? "发布前必须填写" : undefined}>
          <Input mono value={value.baseUrl} placeholder="https://raw.githubusercontent.com/" onChange={(event) => onChange({ ...value, baseUrl: event.target.value })} />
        </Field>
        <label className="flex items-center justify-between gap-4 rounded-sm bg-surface-1 px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--line)]">
          <span>
            <span className="block text-sm text-ink-1">自动补全结尾斜杠</span>
            <span className="block text-xs text-ink-3">基础 URL 不以 / 结尾时自动补上，避免最后一段路径被替换</span>
          </span>
          <Switch checked={value.autoAppendSlash} onCheckedChange={(autoAppendSlash) => onChange({ ...value, autoAppendSlash })} />
        </label>
        <div className="rounded-md bg-surface-1 p-3 shadow-[inset_0_0_0_1px_var(--line)]">
          <div className="mb-2 text-xs font-medium text-ink-2">试一下</div>
          <div className="flex min-w-0 items-center rounded-sm bg-surface-0 font-mono text-xs shadow-[inset_0_0_0_1px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_1px_var(--signal)]">
            <span className="shrink-0 pl-2.5 text-ink-4">{prefix}</span>
            <input
              aria-label="测试子路径"
              value={sample}
              onChange={(event) => setSample(event.target.value)}
              className="h-8 min-w-0 flex-1 bg-transparent pr-2.5 text-ink-1 outline-none"
            />
          </div>
          <div className="mt-2 flex items-start gap-2 font-mono text-xs break-all">
            {resolved ? (
              resolved.allowed ? (
                <>
                  <CheckCircle2 className="mt-px size-3.5 shrink-0 text-signal" />
                  <span className="text-route">{resolved.url}</span>
                </>
              ) : (
                <>
                  <Ban className="mt-px size-3.5 shrink-0 text-danger" />
                  <span className="text-danger">不在路径白名单内，返回 403</span>
                </>
              )
            ) : (
              <span className="text-ink-4">填写基础 URL 后显示转发目标</span>
            )}
          </div>
        </div>
      </FormSection>
      <FormSection title="路径白名单" description="留空表示允许所有子路径。支持 * 通配符，例如 /owner/*。">
        <TagInput value={value.allowedPaths ?? []} onChange={(allowedPaths) => onChange({ ...value, allowedPaths })} placeholder="/owner/repo/*" />
      </FormSection>
      <FormSection title="请求" description="X-Access-Key 与 Host 总会被移除。">
        <Field label="超时" hint="毫秒，1000–30000" error={errors.timeout} className="max-w-48">
          <Input mono type="number" min={1000} max={30000} step={500} value={value.timeout} onChange={(event) => onChange({ ...value, timeout: Number(event.target.value) })} />
        </Field>
        <KeyValueEditor value={value.headers} onChange={(headers) => onChange({ ...value, headers })} />
        <Field label="移除这些请求头" hint="按 Enter 添加">
          <TagInput value={value.removeHeaders ?? []} onChange={(removeHeaders) => onChange({ ...value, removeHeaders })} placeholder="例如 cookie" />
        </Field>
      </FormSection>
    </div>
  );
}
