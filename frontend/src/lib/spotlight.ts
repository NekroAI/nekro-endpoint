import type { PointerEvent } from "react";

/** Feeds the cursor position to the `spotlight` utility (styles.css). */
export function trackSpotlight(event: PointerEvent<HTMLElement>) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  target.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
  target.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
}

export const spotlight = { onPointerMove: trackSpotlight };
