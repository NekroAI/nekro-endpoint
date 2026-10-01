function hostOf(url: string) {
  try {
    const parsed = new URL(url);
    return { host: parsed.host, rest: `${parsed.pathname}${parsed.search}` };
  } catch {
    return { host: url || "未配置", rest: "" };
  }
}

/** Visitor → this endpoint → upstream, drawn with the route colour. */
export function FlowDiagram({ from, to, note }: { from: string; to: string; note?: string }) {
  const target = hostOf(to);
  return (
    <div className="border-b border-line px-6 py-5">
      <div className="flex items-center gap-3 overflow-hidden">
        <Node label="访问者" detail="GET / POST …" />
        <Wire />
        <Node label="此端点" detail={from} accent="signal" />
        <Wire route />
        <Node label={target.host} detail={target.rest || "/"} accent="route" />
      </div>
      {note && <p className="mt-3 text-2xs text-ink-4">{note}</p>}
    </div>
  );
}

function Node({ label, detail, accent }: { label: string; detail: string; accent?: "signal" | "route" }) {
  return (
    <div
      className={
        "min-w-0 shrink rounded-md bg-surface-1 px-3 py-2 shadow-[inset_0_0_0_1px_var(--line)] " +
        (accent === "signal" ? "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--signal)_40%,transparent)]" : "") +
        (accent === "route" ? "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--route)_45%,transparent)]" : "")
      }
    >
      <div className={"truncate text-xs font-medium " + (accent === "route" ? "text-route" : accent === "signal" ? "text-signal" : "text-ink-2")}>{label}</div>
      <div className="truncate font-mono text-2xs text-ink-3">{detail}</div>
    </div>
  );
}

function Wire({ route }: { route?: boolean }) {
  return (
    <div className="relative flex h-3 min-w-8 flex-1 items-center" aria-hidden>
      <div
        className={
          "h-px flex-1 " +
          (route ? "bg-[repeating-linear-gradient(90deg,var(--route)_0_6px,transparent_6px_10px)] opacity-70" : "bg-line-strong")
        }
      />
      <svg viewBox="0 0 6 8" className={"h-2 w-1.5 " + (route ? "text-route" : "text-ink-4")}>
        <path d="M0 0l6 4-6 4z" fill="currentColor" />
      </svg>
    </div>
  );
}
