import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1 font-mono text-2xs text-ink-3",
        "bg-surface-2 shadow-[inset_0_-1px_0_var(--line-strong),inset_0_0_0_1px_var(--line)]",
        className,
      )}
      {...props}
    />
  );
}
