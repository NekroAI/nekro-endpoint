import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** Scrollable page body that leaves room for the Signal Line. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className={cn("mx-auto w-full max-w-6xl px-4 pt-8 pb-32 md:px-8 md:pt-12", className)}>{children}</div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 font-mono text-xs text-ink-3">{eyebrow}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-ink-1">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
