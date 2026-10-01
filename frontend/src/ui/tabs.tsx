import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("flex items-center gap-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm text-ink-3 transition-colors",
        "hover:text-ink-1 data-[state=active]:bg-surface-2 data-[state=active]:text-ink-1",
        "data-[state=active]:shadow-[inset_0_0_0_1px_var(--line)] [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("focus-visible:outline-none data-[state=active]:animate-fade-in", className)}
      {...props}
    />
  );
}
