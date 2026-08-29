"use client";

import { useRef, useState } from "react";

export interface PopoverPosition {
  top: number;
  left: number;
  placement: "above" | "below";
}

/**
 * Berechnet eine viewport-geklammerte Fixed-Position für ein Popover.
 * Öffnet standardmäßig oberhalb des Trigger-Elements, klappt aber automatisch
 * nach unten um, wenn dafür oben nicht genug Platz ist (z.B. beim obersten
 * Eintrag einer Liste) — verhindert, dass das Popover über den Bildschirmrand
 * hinausragt.
 */
export function usePopoverPosition(estimatedWidth: number, estimatedHeight: number = 100) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<PopoverPosition>({ top: 0, left: 0, placement: "above" });

  function update() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const half = estimatedWidth / 2;

    let left = rect.left + rect.width / 2;
    left = Math.max(half + margin, Math.min(window.innerWidth - half - margin, left));

    const spaceAbove = rect.top;
    const placement: "above" | "below" = spaceAbove >= estimatedHeight + margin ? "above" : "below";

    let top: number;
    if (placement === "above") {
      top = rect.top - margin;
    } else {
      top = Math.min(rect.bottom + margin, window.innerHeight - estimatedHeight - margin);
    }

    setPos({ top, left, placement });
  }

  return { triggerRef, pos, update };
}
