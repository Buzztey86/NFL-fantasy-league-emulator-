"use client";

import { useLang } from "@/lib/i18n/LanguageContext";

export function LanguageToggle() {
  const { lang, setLang } = useLang();

  const optionStyle = (active: boolean) => ({
    background: active ? "var(--gold-bg)" : "transparent",
    color: active ? "var(--gold)" : "var(--text-dim)",
    fontWeight: active ? 800 : 600,
  });

  return (
    <div className="flex rounded-full overflow-hidden shadow-lg" style={{ border: "1px solid var(--gold-border)", background: "var(--bg-deep)" }}>
      <button onClick={() => setLang("de")} className="px-3 py-1.5 text-[12px] transition-colors" style={optionStyle(lang === "de")}>
        DE
      </button>
      <button onClick={() => setLang("en")} className="px-3 py-1.5 text-[12px] transition-colors" style={optionStyle(lang === "en")}>
        EN
      </button>
    </div>
  );
}
