"use client";

import { useRef, useState } from "react";

export interface PopoverPosition {
  top: number;
  left: number;
}

/**
 * Berechnet eine viewport-geklammerte Fixed-Position oberhalb des Trigger-
 * Elements. Wird von Tooltip und HoverRadar geteilt, damit beide via Portal
 * in document.body gerendert werden können — das umgeht jegliches
 * overflow:hidden/auto eines Elternelements (z.B. scrollbare Listen).
 */
export function usePopoverPosition(estimatedWidth: number) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<PopoverPosition>({ top: 0, left: 0 });

  function update() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const half = estimatedWidth / 2;
    let left = rect.left + rect.width / 2;
    left = Math.max(half + margin, Math.min(window.innerWidth - half - margin, left));
    const top = Math.max(margin, rect.top - 8);
    setPos({ top, left });
  }

  return { triggerRef, pos, update };
}
