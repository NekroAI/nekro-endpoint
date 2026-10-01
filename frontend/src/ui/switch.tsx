import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
        "bg-surface-3 shadow-[inset_0_0_0_1px_var(--line-strong)] data-[state=checked]:bg-signal",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 rounded-full bg-[var(--switch-thumb)] shadow-[0_1px_2px_rgb(0_0_0/0.3)] transition-transform duration-200 ease-[var(--ease-glide)] data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  );
}
