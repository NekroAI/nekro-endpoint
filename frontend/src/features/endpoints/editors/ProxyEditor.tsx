import type { ProxyConfig } from "../../../../../common/types";
import { Field } from "../../../ui/field";
import { Input } from "../../../ui/input";
import { KeyValueEditor } from "../../../ui/key-value";
import { TagInput } from "../../../ui/tag-input";
import { FormSection } from "./FormSection";
import { FlowDiagram } from "./FlowDiagram";
import { useWorkspace } from "../workspace";

export function validateProxy(config: ProxyConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  try {
    const url = new URL(config.targetUrl);
    if (!["http:", "https:"].includes(url.protocol)) errors.targetUrl = "只支持 http 或 https";
  } catch {
    errors.targetUrl = "请输入完整的 URL，例如 https://api.example.com/data";
  }
  if (!Number.isInteger(config.timeout) || config.timeout < 1000 || config.timeout > 30000) errors.timeout = "范围 1000–30000 毫秒";
  return errors;
}

export function ProxyEditor({ value, onChange }: { value: ProxyConfig; onChange: (value: ProxyConfig) => void }) {
  const { selectedEndpoint, username } = useWorkspace();
  const errors = validateProxy(value);
  return (
    <div>
      <FlowDiagram from={`/e/${username}${selectedEndpoint?.path ?? ""}`} to={value.targetUrl} note="查询串不会转发" />
      <FormSection title="目标" description="每次请求都转发到这个固定地址。方法、请求体和请求头会一起转发。">
        <Field label="目标 URL" error={errors.targetUrl}>
          <Input mono value={value.targetUrl} onChange={(event) => onChange({ ...value, targetUrl: event.target.value })} placeholder="https://" />
        </Field>
        <Field label="超时" hint="毫秒，1000–30000" error={errors.timeout} className="max-w-48">
          <Input
            mono
            type="number"
            min={1000}
            max={30000}
            step={500}
            value={value.timeout}
            onChange={(event) => onChange({ ...value, timeout: Number(event.target.value) })}
          />
        </Field>
      </FormSection>
      <FormSection title="请求头" description="追加或覆盖转发给上游的请求头；X-Access-Key 与 Host 总会被移除。">
        <KeyValueEditor value={value.headers} onChange={(headers) => onChange({ ...value, headers })} />
        <Field label="移除这些请求头" hint="按 Enter 添加，不区分大小写">
          <TagInput value={value.removeHeaders ?? []} onChange={(removeHeaders) => onChange({ ...value, removeHeaders })} placeholder="例如 cookie" />
        </Field>
      </FormSection>
    </div>
  );
}
