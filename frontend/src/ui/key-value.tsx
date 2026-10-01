import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";

type Row = { id: number; key: string; value: string };
let nextId = 1;
const toRows = (record: Record<string, string> | undefined): Row[] =>
  Object.entries(record ?? {}).map(([key, value]) => ({ id: nextId++, key, value }));

/** Editable header map. Empty keys are dropped; later duplicates win, like the server. */
export function KeyValueEditor({
  value,
  onChange,
  keyPlaceholder = "Header",
  valuePlaceholder = "值",
  addLabel = "添加请求头",
}: {
  value: Record<string, string> | undefined;
  onChange: (value: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(value));
  const serialized = JSON.stringify(value ?? {});
  useEffect(() => {
    const current = JSON.stringify(Object.fromEntries(rows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value])));
    if (current !== serialized) setRows(toRows(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  const commit = (next: Row[]) => {
    setRows(next);
    onChange(Object.fromEntries(next.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value])));
  };

  return (
    <div className="grid gap-1.5">
      {rows.map((row, index) => (
        <div key={row.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-1.5">
          <Input
            mono
            aria-label={`第 ${index + 1} 项名称`}
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={(event) => commit(rows.map((r) => (r.id === row.id ? { ...r, key: event.target.value } : r)))}
          />
          <Input
            mono
            aria-label={`第 ${index + 1} 项值`}
            placeholder={valuePlaceholder}
            value={row.value}
            onChange={(event) => commit(rows.map((r) => (r.id === row.id ? { ...r, value: event.target.value } : r)))}
          />
          <Button size="icon" variant="ghost" aria-label="删除" onClick={() => commit(rows.filter((r) => r.id !== row.id))}>
            <X />
          </Button>
        </div>
      ))}
      <div>
        <Button size="sm" variant="ghost" onClick={() => setRows([...rows, { id: nextId++, key: "", value: "" }])}>
          <Plus /> {addLabel}
        </Button>
      </div>
    </div>
  );
}
