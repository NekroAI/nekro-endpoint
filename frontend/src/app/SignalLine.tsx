import { Sparkles } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCommands } from "./commands";
import { Kbd } from "../ui/kbd";
import { cn } from "../lib/cn";

/**
 * Pages with a right-hand panel (the endpoint Focus Sheet) reserve space so the
 * Signal Line centres over the remaining area instead of covering the panel.
 */
const InsetContext = createContext<{ inset: number; setInset: (px: number) => void }>({ inset: 0, setInset: () => {} });

export function SignalLineInsetProvider({ children }: { children: ReactNode }) {
  const [inset, setInset] = useState(0);
  return <InsetContext.Provider value={{ inset, setInset }}>{children}</InsetContext.Provider>;
}

export function useSignalLineInset(px: number) {
  const { setInset } = useContext(InsetContext);
  useEffect(() => {
    setInset(px);
    return () => setInset(0);
  }, [px, setInset]);
}

/**
 * The always-present input at the bottom of the workspace. Until a model is
 * configured (P6) it opens the command palette.
 */
export function SignalLine({ className }: { className?: string }) {
  const { setOpen } = useCommands();
  const { inset } = useContext(InsetContext);
  if (inset < 0) return null;
  return (
    <div
      style={{ right: inset }}
      className={cn("pointer-events-none absolute left-0 bottom-0 z-30 flex justify-center px-4 pb-4 transition-[right] duration-300", className)}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "pointer-events-auto group flex h-11 w-full max-w-[600px] items-center gap-3 rounded-full px-4 text-left",
          "glass shadow-pop transition-shadow duration-200 hover:shadow-[0_0_0_1px_var(--signal),0_12px_32px_-8px_rgb(0_0_0/0.5)]",
        )}
      >
        <Sparkles className="size-4 text-signal transition-transform duration-300 group-hover:rotate-12" />
        <span className="flex-1 truncate text-sm text-ink-3">搜索端点、跳转页面，或执行操作…</span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
    </div>
  );
}
