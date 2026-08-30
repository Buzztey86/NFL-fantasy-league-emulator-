"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Kein Beinbruch, wenn das fehlschlägt (z.B. lokal ohne HTTPS) — App
      // funktioniert auch ohne Service Worker ganz normal, nur ohne
      // Offline-Fallback und ggf. ohne "Zum Homescreen"-Prompt in manchen Browsern.
    });
  }, []);
  return null;
}
