"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RadarChart } from "./RadarChart";
import { usePopoverPosition } from "./popoverPosition";

const WIDTH = 320;
const CHART_SIZE = 176;
const PHOTO_SIZE = 104;

export function HoverRadar({
  axes,
  values,
  tips,
  color,
  photo,
  name,
  children,
}: {
  axes: string[];
  values: number[];
  tips?: string[];
  color: string;
  photo?: string | null;
  name?: string;
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
            className="fixed z-[9999] p-3.5 rounded-xl shadow-2xl"
            style={{
              top: pos.top,
              left: pos.left,
              width: WIDTH,
              transform: "translate(-50%, -100%)",
              background: "var(--bg-deep)",
              border: "1px solid var(--border-mid)",
            }}
          >
            {name && (
              <div
                className="text-[13px] font-bold mb-2 text-center"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                {name}
              </div>
            )}
            <div className="flex items-center gap-3">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt=""
                  width={PHOTO_SIZE}
                  height={PHOTO_SIZE}
                  className="rounded-lg object-cover shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <RadarChart axes={axes} values={values} tips={tips} color={color} size={CHART_SIZE} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
