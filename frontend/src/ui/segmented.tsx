import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { snap } from "../design/motion";

type Option<T extends string> = { value: T; label: ReactNode; icon?: ReactNode; disabled?: boolean };

/** Segmented control with a sliding thumb. Behaves as a radio group. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  className?: string;
  size?: "sm" | "md";
  label: string;
}) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-sm bg-surface-1 p-0.5 shadow-[inset_0_0_0_1px_var(--line)]", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2.5 font-medium transition-colors disabled:opacity-40 [&_svg]:size-3.5",
              size === "sm" ? "h-6 text-xs" : "h-7 text-sm",
              active ? "text-ink-1" : "text-ink-3 hover:text-ink-1",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-thumb`}
                transition={snap}
                className="absolute inset-0 rounded-[5px] bg-surface-3 shadow-[0_1px_2px_rgb(0_0_0/0.2),inset_0_0_0_1px_var(--line-strong)]"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
