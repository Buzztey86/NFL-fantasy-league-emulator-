"use client";

import { useLang } from "@/lib/i18n/LanguageContext";

export function LanguageToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "de" ? "en" : "de")}
      className="fixed top-3 right-3 z-[100] px-2.5 py-1 rounded-md text-[11px] font-bold border"
      style={{ borderColor: "var(--border-mid)", background: "var(--bg-surface)", color: "var(--text-muted)" }}
      title={lang === "de" ? "Switch to English" : "Auf Deutsch umschalten"}
    >
      {t.langToggle}
    </button>
  );
}
