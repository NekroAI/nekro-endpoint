import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import { TooltipProvider } from "../ui/tooltip";
import { Toaster } from "../ui/toaster";
import { ConfirmProvider } from "../ui/confirm";

const loadMotionFeatures = () => import("./motion-features").then((module) => module.default);

/**
 * Providers for the Signal UI; shared by the client and SSR entries.
 * Components import `m as motion`; `strict` keeps the full motion bundle out.
 */
export function SignalProviders({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={350} skipDelayDuration={150}>
          <ConfirmProvider>
            {children}
            <Toaster />
          </ConfirmProvider>
        </TooltipProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
