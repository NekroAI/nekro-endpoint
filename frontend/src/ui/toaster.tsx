import { Toaster as Sonner, toast } from "sonner";
import { useAppTheme } from "../context/ThemeContextProvider";

export { toast };

/** sonner styled with Signal tokens. */
export function Toaster() {
  const { themeMode } = useAppTheme();
  return (
    <Sonner
      theme={themeMode}
      position="bottom-right"
      offset={{ bottom: 88, right: 20 }}
      toastOptions={{
        classNames: {
          toast: "!rounded-md !glass !shadow-pop !border-0 !text-ink-1 !font-sans !text-sm",
          description: "!text-ink-3",
          success: "[&_[data-icon]]:!text-signal",
          error: "[&_[data-icon]]:!text-danger",
          actionButton: "!bg-signal !text-signal-ink",
        },
      }}
    />
  );
}
