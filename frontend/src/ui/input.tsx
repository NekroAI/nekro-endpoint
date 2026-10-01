import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

const fieldBase = [
  "w-full rounded-sm bg-surface-1 text-ink-1 placeholder:text-ink-4",
  "shadow-[inset_0_0_0_1px_var(--line-strong)] transition-shadow duration-150 outline-none",
  "hover:shadow-[inset_0_0_0_1px_var(--ink-4)]",
  "focus-visible:shadow-[inset_0_0_0_1px_var(--signal),0_0_0_3px_var(--signal-soft)] focus-visible:outline-none",
  "aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--danger),0_0_0_3px_var(--danger-soft)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }>(
  ({ className, mono, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-8 px-2.5 text-sm", mono && "font-mono", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }>(
  ({ className, mono, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldBase, "min-h-20 px-2.5 py-2 text-sm leading-relaxed", mono && "font-mono", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
