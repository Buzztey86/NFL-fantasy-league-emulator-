"use client";

import { useState } from "react";
import Link from "next/link";
import { useLeagueState } from "@/lib/useLeagueState";
import { getAvailablePlayers, getPlayerByRank } from "@/lib/players";
import {
  buildDraftOrder,
  getNextPickNumber,
  getRosterForTeam,
  getTeamIdForPick,
  isDraftComplete,
  pickForAITeam,
  pickNumberToRound,
} from "@/lib/draftEngine";
import type { DraftPick, Player, Position } from "@/lib/types";
import { PERSONALITY_QUOTES } from "@/lib/teams";
import { useLang } from "@/lib/i18n/LanguageContext";
import { Tooltip } from "@/components/Tooltip";
import { HoverRadar } from "@/components/HoverRadar";
import { PlayerThumb } from "@/components/PlayerThumb";
import { TeamBadge } from "@/components/TeamBadge";
import { RADAR_AXES, RADAR_AXIS_TIPS } from "@/lib/radarAxes";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { withMemberOwnership, resolveMyTeamId } from "@/lib/league/resolveTeams";

const POSITIONS: (Position | "ALL")[] = ["ALL", "QB", "RB", "WR", "TE", "DST", "K"];
const POS_COLOR: Record<string, string> = {
  QB: "var(--blue)",
  RB: "var(--green)",
  WR: "var(--gold)",
  TE: "var(--purple)",
  DST: "var(--red)",
  K: "var(--text-muted)",
};
const POS_COLOR_HEX: Record<string, string> = {
  QB: "#3B82F6",
  RB: "#10B981",
  WR: "#F59E0B",
  TE: "#8B5CF6",
  DST: "#EF4444",
  K: "#9CA3AF",
};

export default function DraftPage() {
  const { activeLeagueId, activeMembership, loading: leagueCtxLoading, loadError } = useLeagueContext();
  const { state, members, loading, save, cloudSynced } = useLeagueState(activeLeagueId);
  const { t, lang } = useLang();
  const d = t.draft;
  const c = t.common;
  const [posFilter, setPosFilter] = useState<Position | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const order = buildDraftOrder();

  if (loadError) {
    return <main className="p-8 text-[var(--red)] text-sm">{loadError}</main>;
  }
  if (leagueCtxLoading || loading || !state) {
    return <main className="p-8 text-[var(--text-muted)]">{c.loadingDraft}</main>;
  }

  const teams = withMemberOwnership(state.teams, members);
  const { draftLog } = state;
  const myTeamId = resolveMyTeamId(activeMembership, teams, cloudSynced);
  const draftedRanks = new Set(draftLog.map((p) => p.playerRank));
  const available = getAvailablePlayers(draftedRanks);
  const complete = isDraftComplete(draftLog);
  const nextPickNumber = getNextPickNumber(draftLog);
  const currentRound = pickNumberToRound(nextPickNumber);
  const onClockTeamId = complete ? null : getTeamIdForPick(nextPickNumber, order);
  const onClockTeam = teams.find((t) => t.id === onClockTeamId) ?? null;

  const filtered = available.filter((p) => {
    if (posFilter !== "ALL" && p.pos !== posFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const myRoster = getRosterForTeam(myTeamId, draftLog);

  async function makePick(player: Player) {
    if (!onClockTeam || complete) return;
    const pick: DraftPick = {
      pickNumber: nextPickNumber,
      round: currentRound,
      teamId: onClockTeam.id,
      playerRank: player.rank,
      timestamp: new Date().toISOString(),
    };
    await save({ ...state!, draftLog: [...draftLog, pick] });
    setLastEvent(`${d.pick} ${pick.pickNumber} (R${pick.round}): ${onClockTeam.name} → ${player.name}.`);
  }

  async function runAiPick() {
    if (!onClockTeam || onClockTeam.isHuman || complete) return;
    const roster = getRosterForTeam(onClockTeam.id, draftLog);
    const pick = pickForAITeam(onClockTeam, currentRound, available, roster);
    await makePick(pick);
  }

  async function autoPlayUntilHuman() {
    setAutoPlaying(true);
    let log = [...draftLog];
    let n = getNextPickNumber(log);
    let round = pickNumberToRound(n);
    let teamId = complete ? null : getTeamIdForPick(n, order);
    let guard = 0;
    while (teamId !== null && guard < 30) {
      const team = teams.find((t) => t.id === teamId);
      if (!team || team.isHuman) break;
      const dr = new Set(log.map((p) => p.playerRank));
      const avail = getAvailablePlayers(dr);
      const roster = getRosterForTeam(team.id, log);
      const player = pickForAITeam(team, round, avail, roster);
      log = [...log, { pickNumber: n, round, teamId: team.id, playerRank: player.rank, timestamp: new Date().toISOString() }];
      n = log.length + 1;
      round = pickNumberToRound(n);
      teamId = n > order.length ? null : getTeamIdForPick(n, order);
      guard++;
    }
    await save({ ...state!, draftLog: log });
    setAutoPlaying(false);
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-dim)]">
          {c.backToLeague}
        </Link>
        <Link href="/setup" className="text-xs text-[var(--text-dim)]">
          {c.setupArrow}
        </Link>
      </div>

      <header className="text-center mb-6">
        <div className="eyebrow">{cloudSynced ? c.cloudSyncActive : c.localOnlyModeShort}</div>
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}>
          {d.heading}
        </h1>
        {!complete ? (
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {d.pick} {nextPickNumber} · {d.round} {currentRound} ·{" "}
            <span style={{ color: onClockTeam?.color }}>
              {onClockTeamId === myTeamId ? d.yourTurn : onClockTeam?.isHuman ? `${onClockTeam.name} (${d.waitingForPlayer})` : `${onClockTeam?.name} ${d.teamsTurn}`}
            </span>
          </p>
        ) : (
          <p className="text-sm text-[var(--green)] mt-1">{d.complete}</p>
        )}
      </header>

      {!complete && onClockTeam?.isHuman && onClockTeamId !== myTeamId && (
        <div className="card mb-4 text-center text-sm text-[var(--text-secondary)]">
          <span style={{ color: onClockTeam.color, fontWeight: 700 }}>{onClockTeam.manager}</span> {d.waitingForPlayer}
        </div>
      )}

      {!complete && !onClockTeam?.isHuman && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[var(--text-secondary)]">
            <span style={{ color: onClockTeam?.color, fontWeight: 700 }}>{onClockTeam?.manager}</span> {d.onTheClock}
          </div>
          <div className="flex gap-2">
            <button onClick={runAiPick} className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)]">
              {d.runAiPick}
            </button>
            <button
              onClick={autoPlayUntilHuman}
              disabled={autoPlaying}
              className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--border-mid)] text-[var(--text-secondary)] disabled:opacity-40"
            >
              {autoPlaying ? d.autoPlaying : d.autoPlay}
            </button>
          </div>
        </div>
      )}

      {lastEvent && <div className="text-xs text-[var(--text-dim)] text-center mb-4">{lastEvent}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <section>
          <div className="flex gap-2 flex-wrap mb-3">
            {POSITIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPosFilter(p)}
                className="px-3 py-1 rounded-md text-xs font-semibold border transition-colors"
                style={
                  posFilter === p
                    ? { borderColor: p === "ALL" ? "var(--gold)" : POS_COLOR[p], background: "var(--gold-bg)", color: p === "ALL" ? "var(--gold)" : POS_COLOR[p] }
                    : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }
                }
              >
                {p}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={d.searchPlaceholder}
            className="w-full mb-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)]"
          />

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.slice(0, 60).map((p) => (
              <div key={p.rank} className="card flex items-center justify-between gap-3 !py-2.5">
                <PlayerThumb photo={p.photo} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: POS_COLOR[p.pos] }}>
                      {p.pos}
                    </span>
                    <HoverRadar
                      axes={RADAR_AXES[p.pos][lang]}
                      values={p.radar}
                      tips={RADAR_AXIS_TIPS[p.pos][lang]}
                      color={POS_COLOR_HEX[p.pos]}
                      photo={p.photo}
                      name={p.name}
                    >
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate border-b border-dotted border-[var(--text-dim)] cursor-help">
                        {p.name}
                      </span>
                    </HoverRadar>
                    <span className="text-[11px] text-[var(--text-dim)]">#{p.rank}</span>
                  </div>
                  <div className="text-[12px] text-[var(--text-dim)] mt-0.5">
                    {p.team} ·{" "}
                    <Tooltip text={t.tooltips.adp}>
                      ADP {p.adp}
                    </Tooltip>{" "}
                    ·{" "}
                    <Tooltip text={t.tooltips.proj}>
                      Proj {p.proj}
                    </Tooltip>{" "}
                    ·{" "}
                    <Tooltip text={t.tooltips.bye}>
                      Bye {p.bye || "—"}
                    </Tooltip>
                  </div>
                </div>
                <button
                  onClick={() => makePick(p)}
                  disabled={complete || onClockTeamId !== myTeamId}
                  className="shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-30"
                >
                  {d.draftButton}
                </button>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card">
            <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">{d.myRoster}</h2>
            {myRoster.length === 0 ? (
              <p className="text-xs text-[var(--text-dim)]">{d.noPicksYet}</p>
            ) : (
              <ul className="space-y-1">
                {myRoster.map((p) => (
                  <li key={p.rank} className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{p.name}</span>
                    <span style={{ color: POS_COLOR[p.pos] }}>{p.pos}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">{d.recentPicks}</h2>
            <ul className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {[...draftLog]
                .slice(-10)
                .reverse()
                .map((pick) => {
                  const team = teams.find((t) => t.id === pick.teamId);
                  const player = getPlayerByRank(pick.playerRank);
                  return (
                    <li key={pick.pickNumber} className="text-xs">
                      <div className="flex justify-between">
                        <TeamBadge color={team?.color} name={team?.name} />
                        <span className="text-[var(--text-dim)]">#{pick.pickNumber}</span>
                      </div>
                      <div className="text-[var(--text-secondary)]">{player.name}</div>
                      {team && !team.isHuman && (
                        <div className="text-[11px] text-[var(--text-ghost)] italic prose-serif">
                          &ldquo;{PERSONALITY_QUOTES[team.personality][lang]}&rdquo;
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
