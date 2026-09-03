"use client";

import { useState } from "react";
import Link from "next/link";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { useLeagueState } from "@/lib/useLeagueState";
import { withMemberOwnership, resolveMyTeamId } from "@/lib/league/resolveTeams";
import { fetchScoreboard, type GameResult } from "@/lib/nflStats";
import { computeWeekScore } from "@/lib/tippspiel";
import { TeamBadge } from "@/components/TeamBadge";
import { useToast } from "@/components/ToastProvider";
import { useLang } from "@/lib/i18n/LanguageContext";

const SEASON_YEAR = 2026;
const TOTAL_WEEKS = 18;

export default function TippspielPage() {
  const { activeLeagueId, activeMembership, loading: leagueCtxLoading, loadError } = useLeagueContext();
  const { state, members, loading, save, cloudSynced } = useLeagueState(activeLeagueId);
  const { t } = useLang();
  const tp = t.tippspiel;
  const c = t.common;
  const { showToast } = useToast();

  const [tab, setTab] = useState<"picks" | "leaderboard">("picks");
  const [week, setWeek] = useState(1);
  const [games, setGames] = useState<GameResult[] | null>(null);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ teamId: number; correct: number }[] | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  if (loadError) {
    return <main className="p-8 text-[var(--red)] text-sm">{loadError}</main>;
  }
  if (leagueCtxLoading || loading || !state) {
    return <main className="p-8 text-[var(--text-muted)]">{c.loadingLeague}</main>;
  }

  const teams = withMemberOwnership(state.teams, members);
  const myTeamId = resolveMyTeamId(activeMembership, teams, cloudSynced);
  const myPicks = state.tippspielPicks?.[week]?.[myTeamId] ?? {};

  async function loadGames() {
    setGamesLoading(true);
    try {
      const result = await fetchScoreboard(SEASON_YEAR, week, 2);
      setGames(result);
      if (result.length === 0) showToast(tp.noGames, "info");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    }
    setGamesLoading(false);
  }

  async function pick(gameId: string, teamAbbr: string) {
    const weekPicks = { ...(state!.tippspielPicks[week] ?? {}) };
    const teamPicks = { ...(weekPicks[myTeamId] ?? {}), [gameId]: teamAbbr };
    weekPicks[myTeamId] = teamPicks;
    await save({ ...state!, tippspielPicks: { ...state!.tippspielPicks, [week]: weekPicks } });
    showToast(tp.saved);
  }

  async function computeLeaderboardAll() {
    setLeaderboardLoading(true);
    const totals: Record<number, number> = {};
    for (const team of teams) totals[team.id] = 0;

    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      const weekPicksByTeam = state!.tippspielPicks[w];
      if (!weekPicksByTeam) continue;
      try {
        const weekGames = await fetchScoreboard(SEASON_YEAR, w, 2);
        if (weekGames.every((g) => !g.completed)) continue;
        for (const team of teams) {
          const { correct } = computeWeekScore(weekPicksByTeam[team.id], weekGames);
          totals[team.id] += correct;
        }
      } catch {
        // Woche überspringen, falls Abruf fehlschlägt (z.B. Saison noch nicht so weit) — Rest trotzdem berechnen.
      }
    }

    const sorted = teams.map((team) => ({ teamId: team.id, correct: totals[team.id] ?? 0 })).sort((a, b) => b.correct - a.correct);
    setLeaderboard(sorted);
    setLeaderboardLoading(false);
  }

  const myWeekScore = games ? computeWeekScore(myPicks, games) : null;

  return (
    <main className="mx-auto max-w-[700px] px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-dim)]">
          {c.backToLeague}
        </Link>
        <span className="text-xs text-[var(--text-dim)]">{cloudSynced ? c.cloudSyncActive : c.localOnlyModeShort}</span>
      </div>

      <header className="text-center mb-6">
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}>
          {tp.heading}
        </h1>
        <p className="text-xs text-[var(--text-dim)] mt-2">{tp.subtitle}</p>
      </header>

      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={() => setTab("picks")}
          className="px-4 py-1.5 rounded-md text-xs font-semibold border"
          style={tab === "picks" ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
        >
          {tp.picksTab}
        </button>
        <button
          onClick={() => setTab("leaderboard")}
          className="px-4 py-1.5 rounded-md text-xs font-semibold border"
          style={tab === "leaderboard" ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
        >
          {tp.leaderboardTab}
        </button>
      </div>

      {tab === "picks" && (
        <>
          <div className="flex gap-1 flex-wrap justify-center mb-4">
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                onClick={() => {
                  setWeek(w);
                  setGames(null);
                }}
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

          {!games ? (
            <div className="text-center">
              <button
                onClick={loadGames}
                disabled={gamesLoading}
                className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
              >
                {gamesLoading ? tp.loading : `${tp.loadGames} — ${tp.week} ${week}`}
              </button>
            </div>
          ) : (
            <>
              {myWeekScore && myWeekScore.total > 0 && (
                <p className="text-center text-xs text-[var(--gold)] mb-3 tabular-nums">
                  {myWeekScore.correct}/{myWeekScore.total} {tp.correct}
                </p>
              )}
              <div className="space-y-2">
                {games.map((g) => {
                  const picked = myPicks[g.id];
                  const homeWon = g.completed && g.homeScore > g.awayScore;
                  const awayWon = g.completed && g.awayScore > g.homeScore;
                  return (
                    <div key={g.id} className="card flex items-center justify-between gap-2">
                      <button
                        onClick={() => !g.completed && pick(g.id, g.away)}
                        disabled={g.completed}
                        className="flex-1 px-2 py-2 rounded-md text-xs font-semibold border text-center disabled:opacity-70"
                        style={
                          picked === g.away
                            ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" }
                            : { borderColor: "var(--border-mid)", color: awayWon ? "var(--green)" : "var(--text-secondary)" }
                        }
                      >
                        {g.away}
                        {g.completed && <div className="tabular-nums text-[10px] mt-0.5">{g.awayScore}</div>}
                      </button>
                      <span className="text-[10px] text-[var(--text-dim)]">@</span>
                      <button
                        onClick={() => !g.completed && pick(g.id, g.home)}
                        disabled={g.completed}
                        className="flex-1 px-2 py-2 rounded-md text-xs font-semibold border text-center disabled:opacity-70"
                        style={
                          picked === g.home
                            ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" }
                            : { borderColor: "var(--border-mid)", color: homeWon ? "var(--green)" : "var(--text-secondary)" }
                        }
                      >
                        {g.home}
                        {g.completed && <div className="tabular-nums text-[10px] mt-0.5">{g.homeScore}</div>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {tab === "leaderboard" && (
        <>
          <div className="text-center mb-4">
            <button
              onClick={computeLeaderboardAll}
              disabled={leaderboardLoading}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
            >
              {leaderboardLoading ? tp.computing : tp.computeLeaderboard}
            </button>
          </div>
          {leaderboard && (
            <div className="card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-dim)] text-xs border-b border-[var(--border-subtle)]">
                    <th className="py-2">#</th>
                    <th>Team</th>
                    <th className="text-right">{tp.totalCorrect}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => {
                    const team = teams.find((t) => t.id === row.teamId);
                    return (
                      <tr key={row.teamId} className="border-b border-[var(--border-inner)]">
                        <td className="py-2 text-[var(--text-dim)]">{i + 1}</td>
                        <td>
                          <TeamBadge color={team?.color} name={team?.name} className="font-semibold" />
                        </td>
                        <td className="text-right tabular-nums text-[var(--gold)] font-bold">{row.correct}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
