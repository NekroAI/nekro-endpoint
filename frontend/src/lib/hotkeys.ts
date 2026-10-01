import { useEffect, useRef } from "react";

export function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest("input, textarea, select, [contenteditable=true], .monaco-editor"));
}

/**
 * Global key binding. `combo` is like "mod+s", "n", "escape" or "/". Plain keys
 * are ignored while typing; mod-combos always fire.
 */
export function useHotkey(combo: string, handler: (event: KeyboardEvent) => void, enabled = true) {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split("+");
    const key = parts.pop()!;
    const needsMod = parts.includes("mod");
    const needsShift = parts.includes("shift");
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (needsMod !== mod || needsShift !== event.shiftKey || event.altKey) return;
      if (event.key.toLowerCase() !== key) return;
      if (!needsMod && isTypingTarget(event.target)) return;
      // Let open dialogs, menus and popovers own Escape.
      if (key === "escape" && document.querySelector('[role="dialog"][data-state="open"], [role="menu"], [role="listbox"]')) return;
      event.preventDefault();
      latest.current(event);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo, enabled]);
}
