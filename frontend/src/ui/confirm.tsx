import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  /** Require typing this text to enable confirmation. */
  typeToConfirm?: string;
};

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Promise-based confirmation: `if (await confirm({...})) …` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState("");
  const resolver = useRef<(value: boolean) => void>();

  const confirm = useCallback((next: ConfirmOptions) => {
    setTyped("");
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = undefined;
    setOptions(null);
  };

  const blocked = Boolean(options?.typeToConfirm && typed !== options.typeToConfirm);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(options)} onOpenChange={(open) => !open && close(false)}>
        {options && (
          <DialogContent title={options.title} description={options.description} className="w-[min(440px,calc(100vw-32px))]">
            {options.typeToConfirm && (
              <div className="grid gap-1.5">
                <p className="text-xs text-ink-3">
                  输入 <code className="font-mono text-ink-1">{options.typeToConfirm}</code> 以确认
                </p>
                <Input mono autoFocus value={typed} onChange={(event) => setTyped(event.target.value)} />
              </div>
            )}
            <DialogFooter>
              {/* Destructive confirmations focus Cancel, so a stray Enter never confirms. */}
              <Button variant="ghost" autoFocus={options.tone === "danger" && !options.typeToConfirm} onClick={() => close(false)}>
                {options.cancelLabel ?? "取消"}
              </Button>
              <Button
                autoFocus={options.tone !== "danger" && !options.typeToConfirm}
                variant={options.tone === "danger" ? "danger" : "primary"}
                disabled={blocked}
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? "确认"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider");
  return confirm;
}
