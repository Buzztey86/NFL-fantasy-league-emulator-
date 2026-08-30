"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchWeekStats, type WeekStatsResult } from "@/lib/nflStats";
import { scoreOffensePlayer } from "@/lib/scoring";
import { useLang } from "@/lib/i18n/LanguageContext";

const PRESEASON_WEEKS = [1, 2, 3, 4];
const REGULAR_SEASON_WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);
const SEASON_YEAR = 2026;

export default function StatsPage() {
  const { t } = useLang();
  const st = t.stats;
  const c = t.common;
  const [seasonType, setSeasonType] = useState<1 | 2>(2);
  const [week, setWeek] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<WeekStatsResult | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWeekStats(SEASON_YEAR, week, seasonType);
      const anyCompleted = result.games.some((g) => g.completed);
      if (!anyCompleted) {
        setError(st.noGamesFound);
        setStats(null);
      } else {
        setStats(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setLoading(false);
  }

  const players = stats ? Object.values(stats.players) : [];
  const topPassing = [...players].filter((p) => p.passYds > 0).sort((a, b) => b.passYds - a.passYds).slice(0, 10);
  const topRushing = [...players].filter((p) => p.rushYds > 0).sort((a, b) => b.rushYds - a.rushYds).slice(0, 10);
  const topReceiving = [...players].filter((p) => p.recYds > 0).sort((a, b) => b.recYds - a.recYds).slice(0, 10);
  const topFantasy = [...players]
    .map((p) => ({ ...p, fpts: scoreOffensePlayer(p) }))
    .sort((a, b) => b.fpts - a.fpts)
    .slice(0, 10);

  return (
    <main className="mx-auto max-w-[860px] px-4 sm:px-6 py-6">
      <Link href="/" className="text-xs text-[var(--text-dim)]">
        {c.backToLeague}
      </Link>

      <header className="text-center mt-4 mb-6">
        <div className="eyebrow">{st.subtitle}</div>
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,36px)" }}>
          {st.heading}
        </h1>
      </header>

      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={() => {
            setSeasonType(2);
            setWeek(1);
            setStats(null);
            setError(null);
          }}
          className="px-3 py-1.5 rounded-md text-xs font-semibold border"
          style={
            seasonType === 2
              ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" }
              : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }
          }
        >
          {st.regularSeason}
        </button>
        <button
          onClick={() => {
            setSeasonType(1);
            setWeek(1);
            setStats(null);
            setError(null);
          }}
          className="px-3 py-1.5 rounded-md text-xs font-semibold border"
          style={
            seasonType === 1
              ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" }
              : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }
          }
        >
          {st.preseason}
        </button>
      </div>

      <div className="flex gap-1 flex-wrap justify-center mb-4">
        {(seasonType === 1 ? PRESEASON_WEEKS : REGULAR_SEASON_WEEKS).map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className="w-10 h-9 rounded-md text-xs font-semibold border"
            style={
              w === week
                ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" }
                : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }
            }
          >
            {st.week} {w}
          </button>
        ))}
      </div>

      <div className="text-center mb-6">
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
        >
          {loading ? st.loading : st.loadButton}
        </button>
        {error && <p className="text-xs text-[var(--red)] mt-2">{error}</p>}
      </div>

      {!stats && !loading && !error && <p className="text-center text-sm text-[var(--text-dim)]">{st.noData}</p>}

      {stats && (
        <div className="grid sm:grid-cols-2 gap-4">
          <LeaderboardCard title={st.passingLeaders} rows={topPassing.map((p) => ({ name: p.name, team: p.team, value: `${p.passYds} yds` }))} />
          <LeaderboardCard title={st.rushingLeaders} rows={topRushing.map((p) => ({ name: p.name, team: p.team, value: `${p.rushYds} yds` }))} />
          <LeaderboardCard title={st.receivingLeaders} rows={topReceiving.map((p) => ({ name: p.name, team: p.team, value: `${p.recYds} yds` }))} />
          <LeaderboardCard
            title={st.fantasyLeaders}
            rows={topFantasy.map((p) => ({ name: p.name, team: p.team, value: `${p.fpts.toFixed(1)} pts` }))}
          />
        </div>
      )}
    </main>
  );
}

function LeaderboardCard({ title, rows }: { title: string; rows: { name: string; team: string; value: string }[] }) {
  return (
    <div className="card">
      <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-[var(--text-dim)]">—</p>
      ) : (
        <ol className="space-y-1">
          {rows.map((r, i) => (
            <li key={r.name} className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">
                <span className="text-[var(--text-dim)] mr-1.5">{i + 1}.</span>
                {r.name} <span className="text-[var(--text-dim)]">({r.team})</span>
              </span>
              <span className="text-[var(--text-primary)] font-mono">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
