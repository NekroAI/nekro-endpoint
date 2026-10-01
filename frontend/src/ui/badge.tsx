import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type Tone = "neutral" | "signal" | "pass" | "route" | "caution" | "danger";

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-2xs font-medium whitespace-nowrap [&_svg]:size-3",
        tone === "neutral" && "bg-surface-2 text-ink-2",
        tone === "signal" && "bg-signal-soft text-signal",
        tone === "pass" && "bg-pass-soft text-pass",
        tone === "route" && "bg-route-soft text-route",
        tone === "caution" && "bg-caution-soft text-caution",
        tone === "danger" && "bg-danger-soft text-danger",
        className,
      )}
    >
      {children}
    </span>
  );
}
