import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { StaticConfig } from "../../../../../common/types";
import { CodeEditor, languageForContentType } from "../../../design/code-editor";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../../../ui/select";
import { KeyValueEditor } from "../../../ui/key-value";
import { cn } from "../../../lib/cn";

const CONTENT_TYPES: [string, [string, string?][]][] = [
  ["文本", [["text/plain"], ["text/markdown", "Markdown"], ["text/csv", "CSV"]]],
  ["数据", [["application/json", "JSON"], ["text/yaml", "YAML"], ["application/xml", "XML"], ["application/toml", "TOML"]]],
  ["Web", [["text/html", "HTML"], ["text/css", "CSS"], ["application/javascript", "JavaScript"], ["application/typescript", "TypeScript"]]],
  ["配置", [["text/x-ini", "INI"], ["text/x-properties", "Properties"]]],
  [
    "代码",
    [
      ["text/x-python", "Python"],
      ["text/x-shellscript", "Shell"],
      ["application/sql", "SQL"],
      ["text/x-go", "Go"],
      ["text/x-rust", "Rust"],
      ["text/x-java", "Java"],
    ],
  ],
];
const KNOWN = new Set(CONTENT_TYPES.flatMap(([, items]) => items.map(([value]) => value)));

export function StaticEditor({
  value,
  onChange,
  onSave,
}: {
  value: StaticConfig;
  onChange: (value: StaticConfig) => void;
  onSave: () => void;
}) {
  const contentType = value.contentType || "text/plain";
  const [headersOpen, setHeadersOpen] = useState(Boolean(value.headers && Object.keys(value.headers).length));
  const lines = value.content ? value.content.split("\n").length : 0;
  const headerCount = Object.keys(value.headers ?? {}).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-2.5">
        <Select value={contentType} onValueChange={(next) => onChange({ ...value, contentType: next })}>
          <SelectTrigger className="h-7 w-56 font-mono text-xs" aria-label="Content-Type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {!KNOWN.has(contentType) && (
              <SelectItem value={contentType} className="font-mono">
                {contentType}
              </SelectItem>
            )}
            {CONTENT_TYPES.map(([group, items]) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {items.map(([type, hint]) => (
                  <SelectItem key={type} value={type} className="font-mono text-xs" hint={hint}>
                    {type}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setHeadersOpen(!headersOpen)}
          className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs text-ink-3 hover:bg-surface-2 hover:text-ink-1"
          aria-expanded={headersOpen}
        >
          响应头{headerCount ? ` · ${headerCount}` : ""}
          <ChevronDown className={cn("size-3.5 transition-transform", headersOpen && "rotate-180")} />
        </button>
        <span className="ml-auto font-mono text-2xs text-ink-4">
          {lines} 行 · {new Blob([value.content ?? ""]).size} B
        </span>
      </div>
      {headersOpen && (
        <div className="border-b border-line bg-surface-0 px-5 py-3">
          <p className="mb-2 text-xs text-ink-3">随响应一起返回的额外 HTTP 头，例如 Cache-Control。</p>
          <KeyValueEditor value={value.headers} onChange={(headers) => onChange({ ...value, headers })} addLabel="添加响应头" />
        </div>
      )}
      <div className="min-h-0 flex-1">
        <CodeEditor
          value={value.content ?? ""}
          language={languageForContentType(contentType)}
          onChange={(content) => onChange({ ...value, content })}
          onSave={onSave}
          ariaLabel="端点内容"
        />
      </div>
    </div>
  );
}
