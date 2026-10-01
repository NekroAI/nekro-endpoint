import { useId, type SVGProps } from "react";
import { cn } from "../lib/cn";

/** Brand mark: a signal point broadcasting to the edge. */
export function BrandMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-6", className)} aria-hidden {...props}>
      <defs>
        <linearGradient id={`${id}-g`} x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8A2BE2" />
          <stop offset="0.5" stopColor="#4A90E2" />
          <stop offset="1" stopColor="#50E3C2" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.25" stroke={`url(#${id}-g)`} strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M12 5.25A6.75 6.75 0 0 1 18.75 12" stroke={`url(#${id}-g)`} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 18.75A6.75 6.75 0 0 1 5.25 12" stroke={`url(#${id}-g)`} strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.75" fill="#50E3C2" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-ink-1", className)}>
      <BrandMark className="size-5" />
      Endpoints
    </span>
  );
}
