"use client";

import { useState, type ReactNode } from "react";
import { RadarChart } from "./RadarChart";

export function HoverRadar({
  axes,
  values,
  tips,
  color,
  children,
}: {
  axes: string[];
  values: number[];
  tips?: string[];
  color: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onTouchStart={() => setOpen((o) => !o)}
    >
      {children}
      {open && (
        <div
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 p-2 rounded-lg shadow-xl"
          style={{ background: "var(--bg-deep)", border: "1px solid var(--border-mid)" }}
        >
          <RadarChart axes={axes} values={values} tips={tips} color={color} />
        </div>
      )}
    </span>
  );
}
