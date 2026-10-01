import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { cn } from "../lib/cn";

/** Free-form string list: Enter or comma adds, Backspace on empty removes. */
export function TagInput({
  value,
  onChange,
  placeholder,
  id,
  mono = true,
  ...aria
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
  mono?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const items = raw
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && !value.includes(item));
    if (items.length) onChange([...value, ...items]);
    setDraft("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-sm bg-surface-1 px-1.5 py-1",
        "shadow-[inset_0_0_0_1px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_1px_var(--signal),0_0_0_3px_var(--signal-soft)]",
      )}
    >
      {value.map((item) => (
        <span key={item} className={cn("inline-flex h-6 items-center gap-1 rounded-[5px] bg-surface-3 pr-1 pl-2 text-xs text-ink-1", mono && "font-mono")}>
          {item}
          <button
            type="button"
            aria-label={`移除 ${item}`}
            className="grid size-4 place-items-center rounded-sm text-ink-3 hover:text-ink-1"
            onClick={() => onChange(value.filter((other) => other !== item))}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        {...aria}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? "" : placeholder}
        className={cn("h-6 min-w-24 flex-1 bg-transparent px-1 text-sm text-ink-1 outline-none placeholder:text-ink-4", mono && "font-mono")}
      />
    </div>
  );
}
