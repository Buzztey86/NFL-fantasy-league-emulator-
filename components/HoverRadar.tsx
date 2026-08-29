"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RadarChart } from "./RadarChart";
import { usePopoverPosition } from "./popoverPosition";

const WIDTH = 236; // Foto + Chart + Padding

export function HoverRadar({
  axes,
  values,
  tips,
  color,
  photo,
  children,
}: {
  axes: string[];
  values: number[];
  tips?: string[];
  color: string;
  photo?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, pos, update } = usePopoverPosition(WIDTH);

  function show() {
    update();
    setOpen(true);
  }

  return (
    <>
      <span ref={triggerRef} onMouseEnter={show} onMouseLeave={() => setOpen(false)} onTouchStart={() => (open ? setOpen(false) : show())}>
        {children}
      </span>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] p-2 rounded-lg shadow-xl flex items-center gap-1"
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -100%)",
              background: "var(--bg-deep)",
              border: "1px solid var(--border-mid)",
            }}
          >
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt=""
                width={72}
                height={72}
                className="rounded-md object-cover shrink-0"
                style={{ background: "rgba(255,255,255,0.04)" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <RadarChart axes={axes} values={values} tips={tips} color={color} />
          </div>,
          document.body
        )}
    </>
  );
}
