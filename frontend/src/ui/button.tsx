import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap select-none",
    "rounded-sm font-medium transition-[background-color,color,box-shadow,opacity,transform] duration-150",
    "active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-signal text-signal-ink hover:shadow-signal",
        pass: "bg-pass text-pass-ink hover:shadow-pass",
        secondary: "bg-surface-2 text-ink-1 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-3",
        ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink-1",
        outline: "text-ink-1 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2",
        danger:
          "bg-danger-soft text-danger shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--danger)_35%,transparent)] hover:bg-danger hover:text-danger-ink",
        link: "h-auto px-0 text-signal underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-8 px-3 text-sm",
        lg: "h-10 px-4 text-base",
        icon: "size-8",
        "icon-sm": "size-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Component = asChild ? Slot.Root : "button";
    return (
      <Component
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
