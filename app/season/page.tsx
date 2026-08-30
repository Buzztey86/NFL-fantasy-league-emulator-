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
import { useLang } from "@/lib/i18n/LanguageContext";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { withMemberOwnership } from "@/lib/league/resolveTeams";
import { getPlayoffSeeds, getPlayoffMatchupsForWeek, isPlayoffWeek, REGULAR_SEASON_CUTOFF_WEEK, type PlayoffMatchup } from "@/lib/playoffs";

const TOTAL_WEEKS = 17;

export default function SeasonPage() {
  const { activeLeagueId, loading: leagueCtxLoading, loadError } = useLeagueContext();
  const league = useLeagueState(activeLeagueId);
  const season = useSeasonState(activeLeagueId);
  const { t, lang } = useLang();
  const sT = t.season;
  const c = t.common;
  const [week, setWeek] = useState(1);
  const [tab, setTab] = useState<"matchups" | "standings">("matchups");
  const [computing, setComputing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loading = leagueCtxLoading || league.loading || season.loading || !league.state || !season.state;

  const games = useMemo(() => (season.state ? gamesForWeek(season.state.schedule, week) : []), [season.state, week]);

  const standings = useMemo(() => {
    if (!league.state || !season.state) return [];
    const regularSchedule = season.state.schedule.filter((g) => g.week <= REGULAR_SEASON_CUTOFF_WEEK);
    const rec = teamRecord(league.state.teams, regularSchedule, season.state.weeklyScores);
    return league.state.teams
      .map((t) => ({ team: t, ...rec[t.id] }))
      .sort((a, b) => b.w - a.w || b.pf - a.pf);
  }, [league.state, season.state]);

  const playoffSeeds = useMemo(() => {
    if (!league.state || !season.state) return [];
    return getPlayoffSeeds(league.state.teams, season.state.schedule, season.state.weeklyScores);
  }, [league.state, season.state]);

  const playoffMatchups = useMemo(() => {
    if (!isPlayoffWeek(week) || playoffSeeds.length === 0) return [];
    return getPlayoffMatchupsForWeek(playoffSeeds, season.state?.weeklyScores ?? {}, week);
  }, [week, playoffSeeds, season.state]);

  if (loadError) {
    return <main className="p-8 text-[var(--red)] text-sm">{loadError}</main>;
  }
  if (loading) {
    return <main className="p-8 text-[var(--text-muted)]">{c.loadingSeason}</main>;
  }

  const { draftLog } = league.state!;
  const teams = withMemberOwnership(league.state!.teams, league.members);
  const seasonState = season.state!;
  const seedOf = (teamId: number) => playoffSeeds.indexOf(teamId) + 1;
  const byeSeeds = isPlayoffWeek(week) && week === 15 ? [playoffSeeds[0], playoffSeeds[1]] : [];

  async function computeWeek() {
    setComputing(true);
    setStatusMsg(null);
    try {
      const stats = await fetchWeekStats(seasonState.seasonYear, week);

      const anyCompleted = stats.games.some((g) => g.completed);
      if (!anyCompleted) {
        setStatusMsg(sT.noCompletedGames);
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
      setStatusMsg(`${sT.computedMsg} ${week} (${stats.games.filter((g) => g.completed).length} ${sT.gamesEvaluated}).`);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Error.");
    }
    setComputing(false);
  }

  function roundLabel(r: PlayoffMatchup["roundLabel"]) {
    if (r === "quarterfinal") return sT.quarterfinal;
    if (r === "semifinal") return sT.semifinal;
    return sT.championship;
  }

  const champion =
    week === 17 && playoffMatchups.length === 1 && seasonState.weeklyScores[17]?.[playoffMatchups[0].home] != null
      ? (() => {
          const m = playoffMatchups[0];
          const homeScore = seasonState.weeklyScores[17][m.home]?.total ?? 0;
          const awayScore = seasonState.weeklyScores[17][m.away]?.total ?? 0;
          const winnerId = homeScore >= awayScore ? m.home : m.away;
          return teams.find((t) => t.id === winnerId) ?? null;
        })()
      : null;

  return (
    <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-dim)]">
          {c.backToLeague}
        </Link>
        <span className="text-xs text-[var(--text-dim)]">{league.cloudSynced ? c.cloudSyncActive : c.localOnlyModeShort}</span>
      </div>

      <header className="text-center mb-6">
        <div className="eyebrow">
          {lang === "de" ? "Saison" : "Season"} {seasonState.seasonYear}
        </div>
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}>
          {sT.heading}
        </h1>
      </header>

      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={() => setTab("matchups")}
          className="px-4 py-1.5 rounded-md text-xs font-semibold border"
          style={tab === "matchups" ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
        >
          {sT.matchupsTab}
        </button>
        <button
          onClick={() => setTab("standings")}
          className="px-4 py-1.5 rounded-md text-xs font-semibold border"
          style={tab === "standings" ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
        >
          {sT.standingsTab}
        </button>
      </div>

      {tab === "matchups" && (
        <>
          <div className="flex gap-1 flex-wrap justify-center mb-4">
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className="w-9 h-9 rounded-md text-xs font-semibold border"
                style={
                  w === week
                    ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" }
                    : isPlayoffWeek(w)
                    ? { borderColor: "var(--purple)", color: "var(--purple)" }
                    : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }
                }
              >
                {w}
              </button>
            ))}
          </div>

          {isPlayoffWeek(week) && (
            <div className="text-center mb-3">
              <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "var(--purple)" }}>
                {sT.playoffsTab}
              </span>
            </div>
          )}

          <div className="text-center mb-4">
            <button
              onClick={computeWeek}
              disabled={computing}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
            >
              {computing ? sT.computing : `${lang === "de" ? "Woche" : "Week"} ${week} ${sT.computeButton}`}
            </button>
            {statusMsg && <p className="text-xs text-[var(--text-dim)] mt-2">{statusMsg}</p>}
          </div>

          {champion && (
            <div className="card text-center mb-4" style={{ borderColor: "var(--gold)" }}>
              <p className="text-sm text-[var(--text-dim)] mb-1">{sT.champion}</p>
              <p className="text-lg font-black" style={{ color: champion.color, fontFamily: "var(--font-display)" }}>
                {champion.name}
              </p>
            </div>
          )}

          {isPlayoffWeek(week) ? (
            playoffSeeds.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-dim)]">{sT.needsRegularSeason}</p>
            ) : playoffMatchups.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-dim)]">{sT.playoffsNotSet}</p>
            ) : (
              <div className="space-y-2">
                {week === 15 &&
                  byeSeeds.map((teamId) => {
                    const team = teams.find((t) => t.id === teamId);
                    return (
                      <div key={teamId} className="card flex items-center justify-between opacity-70">
                        <span className="text-[10px] text-[var(--text-dim)] w-16">
                          {sT.seed} {seedOf(teamId)}
                        </span>
                        <span style={{ color: team?.color }} className="flex-1 text-center">
                          {team?.name}
                        </span>
                        <span className="text-[10px] text-[var(--purple)] w-16 text-right">{sT.bye}</span>
                      </div>
                    );
                  })}
                {playoffMatchups.map((m, i) => {
                  const home = teams.find((t) => t.id === m.home);
                  const away = teams.find((t) => t.id === m.away);
                  const homeScore = seasonState.weeklyScores[week]?.[m.home]?.total;
                  const awayScore = seasonState.weeklyScores[week]?.[m.away]?.total;
                  const played = homeScore != null && awayScore != null;
                  return (
                    <div key={i} className="card">
                      <div className="text-center text-[10px] text-[var(--purple)] mb-1.5">{roundLabel(m.roundLabel)}</div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-right pr-3">
                          <span className="text-[10px] text-[var(--text-dim)] mr-1">
                            {sT.seed}
                            {seedOf(m.home)}
                          </span>
                          <span style={{ color: home?.color }}>{home?.name}</span>
                        </div>
                        <div className="px-3 text-sm font-bold text-[var(--text-primary)] tabular-nums">
                          {played ? `${homeScore.toFixed(1)} – ${awayScore.toFixed(1)}` : "vs"}
                        </div>
                        <div className="flex-1 pl-3">
                          <span style={{ color: away?.color }}>{away?.name}</span>
                          <span className="text-[10px] text-[var(--text-dim)] ml-1">
                            {sT.seed}
                            {seedOf(m.away)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
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
                    <div className="px-3 text-sm font-bold text-[var(--text-primary)] tabular-nums">
                      {played ? `${homeScore.toFixed(1)} – ${awayScore.toFixed(1)}` : "vs"}
                    </div>
                    <div className="flex-1 pl-3">
                      <span style={{ color: away?.color }}>{away?.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                <th className="text-right" title={t.tooltips.pf}>
                  PF
                </th>
                <th className="text-right" title={t.tooltips.pa}>
                  PA
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.team.id} className="border-b border-[var(--border-inner)]">
                  <td className="py-2 text-[var(--text-dim)]">
                    {i + 1}
                    {i < 6 && <span className="text-[var(--purple)] ml-1">●</span>}
                  </td>
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
          <p className="text-[10px] text-[var(--text-dim)] mt-2">
            <span className="text-[var(--purple)]">●</span> {sT.playoffsTab} (Top 6)
          </p>
        </div>
      )}
    </main>
  );
}
