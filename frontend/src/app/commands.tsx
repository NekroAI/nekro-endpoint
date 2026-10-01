import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Command registry for the palette / Signal Line. The shell contributes
 * navigation; pages contribute their own (e.g. jump to an endpoint) while
 * mounted.
 */
export type CommandItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string[];
  icon?: LucideIcon | ((props: { className?: string }) => JSX.Element);
  shortcut?: string;
  run: () => void;
};

type Registry = {
  items: CommandItem[];
  register: (source: string, items: CommandItem[]) => void;
  unregister: (source: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CommandContext = createContext<Registry | null>(null);

export function CommandProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<Record<string, CommandItem[]>>({});
  const [open, setOpen] = useState(false);

  const register = useCallback((source: string, items: CommandItem[]) => {
    setSources((current) => ({ ...current, [source]: items }));
  }, []);
  const unregister = useCallback((source: string) => {
    setSources(({ [source]: _removed, ...rest }) => rest);
  }, []);

  const items = useMemo(() => Object.values(sources).flat(), [sources]);
  const value = useMemo(() => ({ items, register, unregister, open, setOpen }), [items, register, unregister, open]);
  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>;
}

export function useCommands() {
  const context = useContext(CommandContext);
  if (!context) throw new Error("useCommands must be used inside CommandProvider");
  return context;
}

/** Registers commands for as long as the calling component is mounted. */
export function useRegisterCommands(source: string, items: CommandItem[]) {
  const { register, unregister } = useCommands();
  const latest = useRef(items);
  latest.current = items;
  const signature = items.map((item) => `${item.id}:${item.label}:${item.hint ?? ""}`).join("|");

  useEffect(() => {
    // Delegate to the latest closure so handlers never go stale between renders.
    register(
      source,
      latest.current.map((item) => ({
        ...item,
        run: () => latest.current.find((candidate) => candidate.id === item.id)?.run(),
      })),
    );
  }, [register, source, signature]);
  useEffect(() => () => unregister(source), [unregister, source]);
}
