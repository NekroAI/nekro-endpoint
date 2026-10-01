import { FlaskConical } from "lucide-react";
import type { ScriptConfig } from "../../../../../common/types";
import { CodeEditor } from "../../../design/code-editor";

export function ScriptEditor({ value, onChange, onSave }: { value: ScriptConfig; onChange: (value: ScriptConfig) => void; onSave: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-line bg-caution-soft px-5 py-2.5 text-xs text-caution">
        <FlaskConical className="size-3.5" />
        脚本端点尚未开放执行：访问时返回 501。代码会被保存，开放后即可生效。
      </div>
      <div className="min-h-0 flex-1">
        <CodeEditor value={value.code ?? ""} language="javascript" onChange={(code) => onChange({ ...value, code })} onSave={onSave} ariaLabel="脚本代码" />
      </div>
    </div>
  );
}
