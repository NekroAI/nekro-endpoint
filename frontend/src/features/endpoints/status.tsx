import { cn } from "../../lib/cn";
import type { EndpointStatus } from "./model";
import { statusLabel } from "./model";

/** The signal light: solid glowing (live), hollow (draft), dim (disabled). */
export function StatusDot({ status, className }: { status: EndpointStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        status === "live" && "bg-signal shadow-[0_0_8px_var(--signal)]",
        status === "draft" && "shadow-[inset_0_0_0_1.5px_var(--ink-3)]",
        status === "disabled" && "bg-ink-4",
        className,
      )}
    />
  );
}

export function StatusPill({ status, className }: { status: EndpointStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        status === "live" && "bg-signal-soft text-signal",
        status === "draft" && "bg-surface-2 text-ink-2",
        status === "disabled" && "bg-surface-2 text-ink-3",
        className,
      )}
    >
      <StatusDot status={status} className="size-1.5" />
      {statusLabel[status]}
    </span>
  );
}

