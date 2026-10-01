import type { Transition } from "motion/react";

/** Motion presets (docs/REDESIGN.md §2.6). Reduced motion is handled by MotionConfig. */
export const snap: Transition = { type: "spring", stiffness: 500, damping: 38 };
export const glide: Transition = { type: "spring", stiffness: 260, damping: 30 };
export const ignite: Transition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] };
