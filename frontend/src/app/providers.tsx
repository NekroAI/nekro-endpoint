import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { TooltipProvider } from "../ui/tooltip";
import { Toaster } from "../ui/toaster";

/** Providers for the Signal UI; shared by the client and SSR entries. */
export function SignalProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={350} skipDelayDuration={150}>
        {children}
        <Toaster />
      </TooltipProvider>
    </MotionConfig>
  );
}
