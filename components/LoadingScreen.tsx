"use client";

import { useState } from "react";
import { QBThrowSprite } from "./sprites/QBThrowSprite";
import { RBRunSprite } from "./sprites/RBRunSprite";

export function LoadingScreen({ text, fullScreen = true }: { text: string; fullScreen?: boolean }) {
  // Einmal pro Mount zufällig wählen, nicht bei jedem Re-Render neu würfeln.
  const [variant] = useState(() => (Math.random() < 0.5 ? "qb" : "rb"));

  return (
    <main className={`flex flex-col items-center justify-center gap-3 ${fullScreen ? "min-h-[60vh]" : "py-10"}`}>
      {variant === "qb" ? <QBThrowSprite /> : <RBRunSprite />}
      <p className="text-sm text-[var(--text-dim)]">{text}</p>
    </main>
  );
}
