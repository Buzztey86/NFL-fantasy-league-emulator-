"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLeagueState } from "@/lib/useLeagueState";
import { getCurrentRoster } from "@/lib/roster";
import { autoLineup, LINEUP_SLOTS } from "@/lib/lineup";
import { RADAR_AXES, RADAR_AXIS_TIPS } from "@/lib/radarAxes";
import { HoverRadar } from "@/components/HoverRadar";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { withMemberOwnership, resolveMyTeamId } from "@/lib/league/resolveTeams";
import type { Player } from "@/lib/types";

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

function PlayerRow({ player, lang, action }: { player: Player; lang: "de" | "en"; action?: ReactNode }) {
  const axes = RADAR_AXES[player.pos][lang];
  const tips = RADAR_AXIS_TIPS[player.pos][lang];
  return (
    <div className="card flex items-center justify-between gap-3 !py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: POS_COLOR[player.pos] }}>
            {player.pos}
          </span>
          <HoverRadar axes={axes} values={player.radar} tips={tips} color={POS_COLOR_HEX[player.pos]} photo={player.photo} name={player.name}>
            <span className="text-sm font-semibold text-[var(--text-primary)] border-b border-dotted border-[var(--text-dim)] cursor-help">
              {player.name}
            </span>
          </HoverRadar>
          <span className="text-[11px] text-[var(--text-dim)]">{player.team}</span>
        </div>
        <div className="text-[12px] text-[var(--text-dim)] mt-0.5">
          Proj {player.proj} · Floor {player.floor} · Ceiling {player.upside} · Bye {player.bye || "—"}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex flex-wrap gap-1 justify-end max-w-[140px]">
          {player.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--gold-bg)", color: "var(--gold)" }}>
              {tag}
            </span>
          ))}
        </div>
        {action}
      </div>
    </div>
  );
}

export default function RosterPage() {
  const { activeLeagueId, activeMembership, loading: leagueCtxLoading, loadError } = useLeagueContext();
  const { state, members, loading, save, cloudSynced } = useLeagueState(activeLeagueId);
  const { t, lang } = useLang();
  const r = t.roster;
  const c = t.common;

  if (loadError) {
    return <main className="p-8 text-[var(--red)] text-sm">{loadError}</main>;
  }
  if (leagueCtxLoading || loading || !state) {
    return <main className="p-8 text-[var(--text-muted)]">{c.loadingLeague}</main>;
  }

  const { draftLog, transactions } = state;
  const teams = withMemberOwnership(state.teams, members);
  const myTeamId = resolveMyTeamId(activeMembership, teams, cloudSynced);
  const fullRoster = getCurrentRoster(myTeamId, draftLog, transactions);

  const irRank = state.irSlots?.[myTeamId] ?? null;
  const irPlayer = irRank != null ? fullRoster.find((p) => p.rank === irRank) ?? null : null;
  const activeRoster = fullRoster.filter((p) => p.rank !== irRank);

  const lineup = autoLineup(activeRoster);
  const starterRanks = new Set(LINEUP_SLOTS.map((slot) => lineup[slot]).filter((v): v is number => v != null));
  const starters = activeRoster.filter((p) => starterRanks.has(p.rank));
  const bench = activeRoster.filter((p) => !starterRanks.has(p.rank));

  async function moveToIR(playerRank: number) {
    const newIrSlots = { ...state!.irSlots, [myTeamId]: playerRank };
    await save({ ...state!, irSlots: newIrSlots });
  }

  async function moveToActive() {
    const newIrSlots = { ...state!.irSlots, [myTeamId]: null };
    await save({ ...state!, irSlots: newIrSlots });
  }

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
          {r.heading}
        </h1>
        <p className="text-xs text-[var(--text-dim)] mt-2 max-w-[420px] mx-auto">{r.subtitle}</p>
      </header>

      {fullRoster.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-dim)]">{r.empty}</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">{r.slotStarter}</h2>
            <div className="space-y-2">
              {starters.map((p) => (
                <PlayerRow key={p.rank} player={p} lang={lang} />
              ))}
            </div>
          </section>

          {bench.length > 0 && (
            <section>
              <h2 className="text-[var(--text-dim)] text-xs font-bold tracking-wide mb-2">{r.slotBench}</h2>
              <div className="space-y-2">
                {bench.map((p) => (
                  <PlayerRow
                    key={p.rank}
                    player={p}
                    lang={lang}
                    action={
                      irRank == null ? (
                        <button onClick={() => moveToIR(p.rank)} className="text-[10px] text-[var(--purple)] underline">
                          {r.moveToIR}
                        </button>
                      ) : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-[var(--purple)] text-xs font-bold tracking-wide mb-2">{r.slotIR}</h2>
            {irPlayer ? (
              <PlayerRow
                player={irPlayer}
                lang={lang}
                action={
                  <button onClick={moveToActive} className="text-[10px] text-[var(--green)] underline">
                    {r.moveToActive}
                  </button>
                }
              />
            ) : (
              <p className="text-xs text-[var(--text-dim)]">{r.irEmpty}</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
