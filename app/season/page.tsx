"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLeagueState } from "@/lib/useLeagueState";
import { useSeasonState } from "@/lib/useSeasonState";
import { getRosterForTeam } from "@/lib/draftEngine";
import { autoLineup } from "@/lib/lineup";
import { computeTeamWeekScore } from "@/lib/seasonEngine";
import { gamesForWeek, teamRecord } from "@/lib/schedule";
import { fetchWeekStats } from "@/lib/nflStats";
import { REGULAR_SEASON_WEEKS } from "@/lib/types";

export default function SeasonPage() {
  const league = useLeagueState();
  const season = useSeasonState();
  const [week, setWeek] = useState(1);
  const [tab, setTab] = useState<"matchups" | "standings">("matchups");
  const [computing, setComputing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loading = league.loading || season.loading || !league.state || !season.state;

  const games = useMemo(() => (season.state ? gamesForWeek(season.state.schedule, week) : []), [season.state, week]);

  const standings = useMemo(() => {
    if (!league.state || !season.state) return [];
    const rec = teamRecord(league.state.teams, season.state.schedule, season.state.weeklyScores);
    return league.state.teams
      .map((t) => ({ team: t, ...rec[t.id] }))
      .sort((a, b) => b.w - a.w || b.pf - a.pf);
  }, [league.state, season.state]);

  if (loading) {
    return <main className="p-8 text-[var(--text-muted)]">Lade Season-State…</main>;
  }

  const { teams, draftLog } = league.state!;
  const seasonState = season.state!;

  async function computeWeek() {
    setComputing(true);
    setStatusMsg(null);
    try {
      const stats = await fetchWeekStats(seasonState.seasonYear, week);

      const anyCompleted = stats.games.some((g) => g.completed);
      if (!anyCompleted) {
        setStatusMsg("Noch keine abgeschlossenen Spiele für diese Woche gefunden (Saison evtl. noch nicht gestartet).");
        setComputing(false);
        return;
      }

      const newLineups = { ...seasonState.lineups };
      const newScores = { ...seasonState.weeklyScores };
      newLineups[week] = newLineups[week] ?? {};
      newScores[week] = newScores[week] ?? {};

      for (const team of teams) {
        const roster = getRosterForTeam(team.id, draftLog);
        const lineup = newLineups[week][team.id] ?? autoLineup(roster);
        newLineups[week][team.id] = lineup as any;
        const result = computeTeamWeekScore(lineup as any, roster, stats);
        newScores[week][team.id] = result;
      }

      await season.save({ ...seasonState, lineups: newLineups, weeklyScores: newScores });
      setStatusMsg(`Woche ${week} berechnet (${stats.games.filter((g) => g.completed).length} Spiele ausgewertet).`);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Fehler beim Berechnen.");
    }
    setComputing(false);
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-dim)]">
          ← Liga
        </Link>
        <span className="text-xs text-[var(--text-dim)]">{league.cloudSynced ? "Cloud-Sync aktiv" : "Local-Only-Modus"}</span>
      </div>

      <header className="text-center mb-6">
        <div className="eyebrow">Saison {seasonState.seasonYear}</div>
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}>
          SEASON
        </h1>
      </header>

      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={() => setTab("matchups")}
          className="px-4 py-1.5 rounded-md text-xs font-semibold border"
          style={tab === "matchups" ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
        >
          Matchups
        </button>
        <button
          onClick={() => setTab("standings")}
          className="px-4 py-1.5 rounded-md text-xs font-semibold border"
          style={tab === "standings" ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
        >
          Standings
        </button>
      </div>

      {tab === "matchups" && (
        <>
          <div className="flex gap-1 flex-wrap justify-center mb-4">
            {Array.from({ length: REGULAR_SEASON_WEEKS }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className="w-9 h-9 rounded-md text-xs font-semibold border"
                style={
                  w === week
                    ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" }
                    : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }
                }
              >
                {w}
              </button>
            ))}
          </div>

          <div className="text-center mb-4">
            <button
              onClick={computeWeek}
              disabled={computing}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
            >
              {computing ? "Berechne…" : `Woche ${week} berechnen (echte NFL-Stats)`}
            </button>
            {statusMsg && <p className="text-xs text-[var(--text-dim)] mt-2">{statusMsg}</p>}
          </div>

          <div className="space-y-2">
            {games.map((g, i) => {
              const home = teams.find((t) => t.id === g.homeTeamId);
              const away = teams.find((t) => t.id === g.awayTeamId);
              const homeScore = seasonState.weeklyScores[week]?.[g.homeTeamId]?.total;
              const awayScore = seasonState.weeklyScores[week]?.[g.awayTeamId]?.total;
              const played = homeScore != null && awayScore != null;
              return (
                <div key={i} className="card flex items-center justify-between">
                  <div className="flex-1 text-right pr-3">
                    <span style={{ color: home?.color }}>{home?.name}</span>
                  </div>
                  <div className="px-3 text-sm font-bold text-[var(--text-primary)] font-mono">
                    {played ? `${homeScore.toFixed(1)} – ${awayScore.toFixed(1)}` : "vs"}
                  </div>
                  <div className="flex-1 pl-3">
                    <span style={{ color: away?.color }}>{away?.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "standings" && (
        <div className="card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-dim)] text-xs border-b border-[var(--border-subtle)]">
                <th className="py-2">#</th>
                <th>Team</th>
                <th className="text-center">W</th>
                <th className="text-center">L</th>
                <th className="text-center">T</th>
                <th className="text-right">PF</th>
                <th className="text-right">PA</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.team.id} className="border-b border-[var(--border-inner)]">
                  <td className="py-2 text-[var(--text-dim)]">{i + 1}</td>
                  <td style={{ color: s.team.color }} className="font-semibold">
                    {s.team.name}
                  </td>
                  <td className="text-center">{s.w}</td>
                  <td className="text-center">{s.l}</td>
                  <td className="text-center">{s.t}</td>
                  <td className="text-right text-[var(--text-secondary)]">{s.pf.toFixed(1)}</td>
                  <td className="text-right text-[var(--text-dim)]">{s.pa.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
