"use client";

import { useState, type ReactNode } from "react";

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onTouchStart={() => setOpen((o) => !o)}
    >
      <span className="border-b border-dotted border-[var(--text-dim)] cursor-help">{children}</span>
      {open && (
        <span
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 text-left text-[11px] leading-snug p-2.5 rounded-md shadow-lg"
          style={{
            background: "var(--bg-deep)",
            border: "1px solid var(--border-mid)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
