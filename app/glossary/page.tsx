"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/LanguageContext";

export default function GlossaryPage() {
  const { t } = useLang();
  const g = t.glossary;
  const c = t.common;

  const statTooltipEntries = Object.entries(t.tooltips);

  return (
    <main className="mx-auto max-w-[700px] px-6 py-10">
      <Link href="/" className="text-xs text-[var(--text-dim)]">
        {c.backToLeague}
      </Link>
      <header className="text-center mt-4 mb-8">
        <h1
          className="hero-gradient-text font-black"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,36px)", letterSpacing: "-1px" }}
        >
          {g.heading}
        </h1>
        <p className="text-sm text-[var(--text-dim)] mt-2">{g.subtitle}</p>
      </header>

      <section className="card mb-6">
        <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-3">{g.statTooltipsHeading}</h2>
        <div className="space-y-3">
          {statTooltipEntries.map(([key, text]) => (
            <div key={key} className="text-sm border-b border-[var(--border-inner)] pb-2 last:border-0">
              <p className="text-[var(--text-secondary)]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {g.terms.map((entry) => (
          <div key={entry.term} className="card">
            <div className="text-[var(--gold)] text-sm font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
              {entry.term}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{entry.def}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
