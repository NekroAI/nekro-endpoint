import { useId, type ReactElement, type ReactNode, cloneElement } from "react";
import { cn } from "../lib/cn";

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  /** A single control; it receives id / aria-describedby / aria-invalid. */
  children: ReactElement;
  aside?: ReactNode;
};

/** Label + control + hint/error, wired for assistive technology. */
export function Field({ label, hint, error, className, children, aside }: FieldProps) {
  const id = useId();
  const describedBy = error || hint ? `${id}-desc` : undefined;
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-ink-2">
          {label}
        </label>
        {aside}
      </div>
      {cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {(error || hint) && (
        <p id={describedBy} className={cn("text-xs", error ? "text-danger" : "text-ink-3")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
