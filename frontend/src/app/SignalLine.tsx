import { ArrowUp, Sparkles, Square } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useOptionalSignal, useSignal } from "../features/signal/SignalProvider";
import { SignalPanel } from "../features/signal/SignalPanel";
import { useHotkey } from "../lib/hotkeys";
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
 * The always-present input at the bottom of the workspace (docs/REDESIGN.md
 * §5). With a model configured it talks to Signal; otherwise it opens the
 * command palette.
 */
export function SignalLine({ className }: { className?: string }) {
  const { setOpen: openPalette } = useCommands();
  const { inset } = useContext(InsetContext);
  const signal = useOptionalSignal();
  if (inset < 0) return null;
  return (
    <div
      style={{ right: inset }}
      className={cn(
        "pointer-events-none absolute bottom-0 left-0 z-30 flex flex-col items-center px-4 pb-4 transition-[right] duration-300",
        className,
      )}
    >
      {signal?.enabled ? <SignalInput /> : <Launcher onOpen={() => openPalette(true)} />}
    </div>
  );
}

const pill =
  "pointer-events-auto flex h-11 w-full max-w-[600px] items-center gap-3 rounded-full px-4 glass shadow-pop transition-shadow duration-200";

function Launcher({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(pill, "group text-left hover:shadow-[0_0_0_1px_var(--signal),0_12px_32px_-8px_rgb(0_0_0/0.5)]")}
    >
      <Sparkles className="size-4 text-signal transition-transform duration-300 group-hover:rotate-12" />
      <span className="flex-1 truncate text-sm text-ink-3">搜索端点、跳转页面，或执行操作…</span>
      <span className="hidden items-center gap-1 sm:flex">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

function SignalInput() {
  const { send, status, stop, open, setOpen, messages } = useSignal();
  const { setOpen: openPalette } = useCommands();
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const busy = status === "submitted" || status === "streaming";
  useHotkey("mod+i", () => input.current?.focus());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || busy) return;
    send(text);
    setText("");
  };

  return (
    <>
      <AnimatePresence>{open && messages.length > 0 && <SignalPanel />}</AnimatePresence>
      <form
        onSubmit={submit}
        className={cn(
          pill,
          "focus-within:shadow-[0_0_0_1px_var(--signal),0_0_32px_-8px_var(--signal),0_12px_32px_-8px_rgb(0_0_0/0.5)]",
          busy && "shadow-[0_0_0_1px_color-mix(in_srgb,var(--signal)_50%,transparent),0_12px_32px_-8px_rgb(0_0_0/0.5)]",
        )}
      >
        <button
          type="button"
          aria-label={open ? "收起对话" : "展开对话"}
          onClick={() => setOpen(!open)}
          className="grid size-6 shrink-0 place-items-center rounded-full"
        >
          <Sparkles className={cn("size-4 text-signal", busy && "animate-pulse")} />
        </button>
        <input
          ref={input}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => messages.length > 0 && setOpen(true)}
          onKeyDown={(event) => event.key === "Escape" && (setOpen(false), event.currentTarget.blur())}
          placeholder="告诉 Signal 你想做什么…"
          aria-label="告诉 Signal 你想做什么"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink-1 outline-none placeholder:text-ink-4"
        />
        {busy ? (
          <button
            type="button"
            onClick={stop}
            aria-label="停止"
            className="grid size-7 place-items-center rounded-full bg-surface-3 text-ink-1"
          >
            <Square className="size-3 fill-current" />
          </button>
        ) : text ? (
          <button
            type="submit"
            aria-label="发送"
            className="grid size-7 place-items-center rounded-full bg-signal text-signal-ink"
          >
            <ArrowUp className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openPalette(true)}
            className="hidden items-center gap-1 sm:flex"
            aria-label="打开命令面板"
          >
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </button>
        )}
      </form>
    </>
  );
}
