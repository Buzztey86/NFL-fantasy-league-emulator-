"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { useLeagueState } from "@/lib/useLeagueState";
import { useSeasonState } from "@/lib/useSeasonState";
import { withMemberOwnership, resolveMyTeamId } from "@/lib/league/resolveTeams";
import { getCurrentRoster } from "@/lib/roster";
import { autoLineup, LINEUP_SLOTS, SLOT_ELIGIBLE_POS, type Lineup } from "@/lib/lineup";
import { REGULAR_SEASON_WEEKS } from "@/lib/types";
import { useLang } from "@/lib/i18n/LanguageContext";

const POS_COLOR: Record<string, string> = {
  QB: "var(--blue)",
  RB: "var(--green)",
  WR: "var(--gold)",
  TE: "var(--purple)",
  DST: "var(--red)",
  K: "var(--text-muted)",
};

export default function LineupPage() {
  const { activeLeagueId, activeMembership, loading: leagueCtxLoading, loadError } = useLeagueContext();
  const league = useLeagueState(activeLeagueId);
  const season = useSeasonState(activeLeagueId);
  const { t } = useLang();
  const l = t.lineup;
  const c = t.common;

  const [week, setWeek] = useState(1);
  const [lineup, setLineup] = useState<Lineup | null>(null);
  const [saved, setSaved] = useState(false);

  const loading = leagueCtxLoading || league.loading || season.loading || !league.state || !season.state;

  const teams = useMemo(() => (league.state ? withMemberOwnership(league.state.teams, league.members) : []), [league.state, league.members]);
  const myTeamId = league.state ? resolveMyTeamId(activeMembership, teams, league.cloudSynced) : 0;
  const roster = useMemo(
    () => (league.state ? getCurrentRoster(myTeamId, league.state.draftLog, league.state.transactions) : []),
    [league.state, myTeamId]
  );

  const savedLineup = season.state?.lineups[week]?.[myTeamId] as unknown as Lineup | undefined;
  const alreadyScored = Boolean(season.state?.weeklyScores[week]?.[myTeamId]);

  useEffect(() => {
    if (!season.state) return;
    const existing = season.state.lineups[week]?.[myTeamId] as unknown as Lineup | undefined;
    setLineup(existing ?? (roster.length > 0 ? autoLineup(roster) : null));
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, myTeamId, roster.length, season.state === null]);

  if (loadError) {
    return <main className="p-8 text-[var(--red)] text-sm">{loadError}</main>;
  }
  if (loading) {
    return <main className="p-8 text-[var(--text-muted)]">{c.loadingSeason}</main>;
  }

  const rosterByRank = new Map(roster.map((p) => [p.rank, p]));
  const usedRanks = new Set(lineup ? Object.values(lineup).filter((v): v is number => v != null) : []);
  const benchPlayers = roster.filter((p) => !usedRanks.has(p.rank));

  const projTotal = lineup
    ? LINEUP_SLOTS.reduce((sum, slot) => {
        const rank = lineup[slot];
        const p = rank != null ? rosterByRank.get(rank) : undefined;
        return sum + (p?.proj ?? 0);
      }, 0)
    : 0;

  const actualSlots = season.state?.weeklyScores[week]?.[myTeamId]?.slots;

  function setSlot(slot: keyof Lineup, rank: number | null) {
    setLineup((prev) => (prev ? { ...prev, [slot]: rank } : prev));
    setSaved(false);
  }

  async function save() {
    if (!lineup || !season.state) return;
    const newLineups = { ...season.state.lineups };
    newLineups[week] = { ...(newLineups[week] ?? {}), [myTeamId]: lineup as unknown as Record<string, number | null> };
    await season.save({ ...season.state, lineups: newLineups });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="mx-auto max-w-[700px] px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-dim)]">
          {c.backToLeague}
        </Link>
        <span className="text-xs text-[var(--text-dim)]">{league.cloudSynced ? c.cloudSyncActive : c.localOnlyModeShort}</span>
      </div>

      <header className="text-center mb-6">
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}>
          {l.heading}
        </h1>
        <p className="text-xs text-[var(--text-dim)] mt-2">{l.subtitle}</p>
      </header>

      <div className="flex gap-1 flex-wrap justify-center mb-5">
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

      {roster.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-dim)]">{l.noRoster}</p>
      ) : (
        <>
          {!savedLineup && (
            <p className="text-center text-[11px] text-[var(--text-dim)] mb-3 italic">{l.autoFilled}</p>
          )}
          {alreadyScored && (
            <p className="text-center text-[11px] text-[var(--gold)] mb-3">{l.alreadyScored}</p>
          )}

          <div className="card mb-4">
            <div className="space-y-2">
              {LINEUP_SLOTS.map((slot) => {
                const eligible = SLOT_ELIGIBLE_POS[slot];
                const options = roster.filter((p) => eligible.includes(p.pos) && (!usedRanks.has(p.rank) || lineup?.[slot] === p.rank));
                const currentRank = lineup?.[slot] ?? null;
                const currentPlayer = currentRank != null ? rosterByRank.get(currentRank) : undefined;
                const actualPts = actualSlots?.find((s) => s.slot === slot)?.points;
                return (
                  <div key={slot} className="flex items-center gap-2">
                    <span className="w-11 shrink-0 text-[11px] font-bold" style={{ color: POS_COLOR[eligible[0]] }}>
                      {slot}
                    </span>
                    <select
                      value={currentRank ?? ""}
                      onChange={(e) => setSlot(slot, e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-2 py-1.5 text-xs text-[var(--text-primary)]"
                    >
                      <option value="">{l.empty}</option>
                      {options.map((p) => (
                        <option key={p.rank} value={p.rank}>
                          {p.name} ({p.pos}, {p.team}) · Proj {p.proj}
                        </option>
                      ))}
                    </select>
                    {actualPts != null && (
                      <span className="w-12 shrink-0 text-right text-xs font-mono text-[var(--green)]">{actualPts.toFixed(1)}</span>
                    )}
                    {!currentPlayer && actualPts == null && <span className="w-12 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <span className="text-xs text-[var(--text-dim)]">{l.projTotal}</span>
            <span className="text-sm font-bold text-[var(--gold)] font-mono">{projTotal.toFixed(1)}</span>
          </div>

          <div className="text-center mb-6">
            <button onClick={save} className="px-5 py-2.5 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)]">
              {saved ? l.saved : l.save}
            </button>
          </div>

          {benchPlayers.length > 0 && (
            <div className="card">
              <h2 className="text-[var(--text-dim)] text-xs font-bold tracking-wide mb-2">{l.bench}</h2>
              <div className="space-y-1">
                {benchPlayers.map((p) => (
                  <div key={p.rank} className="flex justify-between text-xs">
                    <span>
                      <span style={{ color: POS_COLOR[p.pos] }} className="font-bold mr-1.5">
                        {p.pos}
                      </span>
                      {p.name}
                    </span>
                    <span className="text-[var(--text-dim)]">Proj {p.proj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
