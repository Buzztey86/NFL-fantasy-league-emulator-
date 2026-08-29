import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-[860px] px-6 py-10">
      <header className="text-center border-b border-[var(--border-subtle)] pb-8 mb-10">
        <div className="eyebrow mb-2">Saison 2026 · PPR · Snake Draft · 10 Teams</div>
        <h1
          className="hero-gradient-text font-black tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 5vw, 48px)", letterSpacing: "-1px" }}
        >
          THE GRIDIRON ORACLE
        </h1>
        <p className="text-[var(--text-dim)] text-sm mt-2">Deine Liga, jetzt von jedem Gerät aus.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/draft" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            DRAFT ROOM →
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Live-Draftboard, KI-Manager picken automatisch, Fortschritt synct über alle deine Geräte.
          </p>
        </Link>

        <Link href="/setup" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            LIGA-SETUP →
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Draft-Reihenfolge festlegen, bestehenden Draft-Stand importieren oder neu starten.
          </p>
        </Link>

        <Link href="/season" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            SEASON →
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Matchups, Standings und Live-Scoring aus echten NFL-Stats (ESPN, kostenlos).
          </p>
        </Link>

        <Link href="/waivers" className="card card-hover block">
          <div className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1" style={{ fontFamily: "var(--font-display)" }}>
            WAIVER &amp; TRADES →
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            FAAB-Gebote gegen 9 KI-Manager, Trade-Center mit persönlichkeitsbasierter KI-Bewertung.
          </p>
        </Link>
      </div>

      <footer className="text-center text-[11px] text-[var(--text-ghost)] mt-16">
        The Gridiron Oracle League · Eigene Web-App · v0.1
      </footer>
    </main>
  );
}
