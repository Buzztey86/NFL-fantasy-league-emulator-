"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/LanguageContext";

export default function Home() {
  const { t } = useLang();
  const h = t.home;

  return (
    <main className="mx-auto max-w-[860px] px-6 py-10">
      <header className="text-center border-b border-[var(--border-subtle)] pb-8 mb-10">
        <div className="eyebrow mb-2">{h.eyebrow}</div>
        <h1
          className="hero-gradient-text font-black tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 5vw, 48px)", letterSpacing: "-1px" }}
        >
          {h.title}
        </h1>
        <p className="text-[var(--text-dim)] text-sm mt-2">{h.subtitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/draft" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {h.draftTitle}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{h.draftDesc}</p>
        </Link>

        <Link href="/setup" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {h.setupTitle}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{h.setupDesc}</p>
        </Link>

        <Link href="/season" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {h.seasonTitle}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{h.seasonDesc}</p>
        </Link>

        <Link href="/waivers" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {h.waiverTitle}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{h.waiverDesc}</p>
        </Link>

        <Link href="/stats" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {h.statsTitle}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{h.statsDesc}</p>
        </Link>

        <Link href="/roster" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {h.rosterTitle}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{h.rosterDesc}</p>
        </Link>

        <Link href="/lineup" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {h.lineupTitle}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{h.lineupDesc}</p>
        </Link>

        <Link href="/glossary" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {h.glossaryTitle}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{h.glossaryDesc}</p>
        </Link>
      </div>

      <footer className="text-center text-[12px] text-[var(--text-ghost)] mt-16">{h.footer}</footer>
    </main>
  );
}
