"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePopoverPosition } from "./popoverPosition";

const WIDTH = 300;

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { triggerRef, pos, update } = usePopoverPosition(WIDTH);

  function show() {
    update();
    setOpen(true);
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="border-b border-dotted border-[var(--text-dim)] cursor-help"
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onTouchStart={() => (open ? setOpen(false) : show())}
      >
        {children}
      </span>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none text-left text-[14px] leading-relaxed p-4 rounded-lg shadow-2xl"
            style={{
              top: pos.top,
              left: pos.left,
              width: `min(88vw, ${WIDTH}px)`,
              transform: "translate(-50%, -100%)",
              background: "var(--bg-deep)",
              border: "1px solid var(--border-mid)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body)",
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
}
