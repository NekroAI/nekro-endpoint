import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";
import { menuItem, menuSurface } from "./dropdown-menu";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;

export function SelectTrigger({ className, children, placeholder, ...props }: ComponentProps<typeof SelectPrimitive.Trigger> & { placeholder?: string }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-8 w-full items-center justify-between gap-2 rounded-sm bg-surface-1 px-2.5 text-sm text-ink-1",
        "shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none hover:shadow-[inset_0_0_0_1px_var(--ink-4)]",
        "focus-visible:shadow-[inset_0_0_0_1px_var(--signal),0_0_0_3px_var(--signal-soft)] data-[placeholder]:text-ink-4",
        className,
      )}
      {...props}
    >
      {children ?? <SelectPrimitive.Value placeholder={placeholder} />}
      <SelectPrimitive.Icon>
        <ChevronDown className="size-4 text-ink-3" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export const SelectValue = SelectPrimitive.Value;

export function SelectContent({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content position="popper" sideOffset={6} className={cn(menuSurface, "max-h-80 w-[var(--radix-select-trigger-width)]", className)} {...props}>
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, hint, ...props }: ComponentProps<typeof SelectPrimitive.Item> & { hint?: ReactNode }) {
  return (
    <SelectPrimitive.Item className={cn(menuItem, "pr-8", className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      {hint && <span className="ml-auto text-xs text-ink-4">{hint}</span>}
      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <Check className="size-4 text-signal" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label className={cn("px-2 py-1.5 text-2xs font-medium text-ink-3 uppercase", className)} {...props} />;
}
