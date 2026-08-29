"use client";

import { useLeagueContext } from "@/lib/league/LeagueContext";
import { useLang } from "@/lib/i18n/LanguageContext";

export function LeagueSwitcher() {
  const { memberships, activeLeagueId, setActiveLeagueId, loading } = useLeagueContext();
  const { t } = useLang();

  // Nur anzeigen, wenn es überhaupt etwas zum Wechseln gibt.
  if (loading || memberships.length < 2) return null;

  return (
    <div
      className="fixed top-4 left-4 z-[100] flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg"
      style={{ border: "1px solid var(--border-mid)", background: "var(--bg-deep)" }}
    >
      <span className="text-[11px] text-[var(--text-dim)] hidden sm:inline">{t.leagueSwitcher.switchLeague}:</span>
      <select
        value={activeLeagueId ?? ""}
        onChange={(e) => setActiveLeagueId(e.target.value)}
        className="bg-transparent text-[12px] font-semibold text-[var(--gold)] focus:outline-none"
      >
        {memberships.map((m) => (
          <option key={m.leagueId} value={m.leagueId} style={{ background: "var(--bg-deep)", color: "var(--text-primary)" }}>
            {m.leagueName} {m.isOwner ? "★" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
