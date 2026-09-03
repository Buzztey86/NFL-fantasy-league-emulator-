"use client";

import { useState } from "react";
import Link from "next/link";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { useLeagueState } from "@/lib/useLeagueState";
import { withMemberOwnership, resolveMyTeamId } from "@/lib/league/resolveTeams";
import { getCurrentRoster } from "@/lib/roster";
import { autoLineup, LINEUP_SLOTS } from "@/lib/lineup";
import { RADAR_AXES, RADAR_AXIS_TIPS } from "@/lib/radarAxes";
import { HoverRadar } from "@/components/HoverRadar";
import { PlayerThumb } from "@/components/PlayerThumb";
import { TeamBadge } from "@/components/TeamBadge";
import { useLang } from "@/lib/i18n/LanguageContext";
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

function PlayerLine({ player, lang }: { player: Player; lang: "de" | "en" }) {
  const axes = RADAR_AXES[player.pos][lang];
  const tips = RADAR_AXIS_TIPS[player.pos][lang];
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-[var(--border-inner)] last:border-0">
      <PlayerThumb photo={player.photo} size={26} />
      <span className="text-[11px] font-bold shrink-0" style={{ color: POS_COLOR[player.pos] }}>
        {player.pos}
      </span>
      <HoverRadar axes={axes} values={player.radar} tips={tips} color={POS_COLOR_HEX[player.pos]} photo={player.photo} name={player.name}>
        <span className="text-sm text-[var(--text-primary)] border-b border-dotted border-[var(--text-dim)] cursor-help">{player.name}</span>
      </HoverRadar>
      <span className="text-[11px] text-[var(--text-dim)] ml-auto shrink-0">{player.team}</span>
    </div>
  );
}

export default function TeamsPage() {
  const { activeLeagueId, activeMembership, loading: leagueCtxLoading, loadError } = useLeagueContext();
  const { state, members, loading, cloudSynced } = useLeagueState(activeLeagueId);
  const { t, lang } = useLang();
  const tt = t.teams;
  const c = t.common;
  const [viewTeamId, setViewTeamId] = useState<number | null>(null);

  if (loadError) {
    return <main className="p-8 text-[var(--red)] text-sm">{loadError}</main>;
  }
  if (leagueCtxLoading || loading || !state) {
    return <main className="p-8 text-[var(--text-muted)]">{c.loadingLeague}</main>;
  }

  const teams = withMemberOwnership(state.teams, members);
  const myTeamId = resolveMyTeamId(activeMembership, teams, cloudSynced);
  const selectedId = viewTeamId ?? myTeamId;
  const selectedTeam = teams.find((t) => t.id === selectedId)!;

  const irRank = state.irSlots?.[selectedId] ?? null;
  const fullRoster = getCurrentRoster(selectedId, state.draftLog, state.transactions);
  const activeRoster = fullRoster.filter((p) => p.rank !== irRank);
  const irPlayer = irRank != null ? fullRoster.find((p) => p.rank === irRank) ?? null : null;

  const lineup = autoLineup(activeRoster);
  const starterRanks = new Set(LINEUP_SLOTS.map((slot) => lineup[slot]).filter((v): v is number => v != null));
  const starters = activeRoster.filter((p) => starterRanks.has(p.rank));
  const bench = activeRoster.filter((p) => !starterRanks.has(p.rank));

  return (
    <main className="mx-auto max-w-[700px] px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-dim)]">
          {c.backToLeague}
        </Link>
        <span className="text-xs text-[var(--text-dim)]">{cloudSynced ? c.cloudSyncActive : c.localOnlyModeShort}</span>
      </div>

      <header className="text-center mb-5">
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}>
          {tt.heading}
        </h1>
        <p className="text-xs text-[var(--text-dim)] mt-2">{tt.subtitle}</p>
      </header>

      <div className="flex flex-wrap gap-2 justify-center mb-5">
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => setViewTeamId(team.id)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border"
            style={
              selectedId === team.id
                ? { borderColor: team.color, background: "rgba(255,255,255,0.06)", color: team.color }
                : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }
            }
          >
            {team.name}
          </button>
        ))}
      </div>

      <div className="text-center mb-4">
        <TeamBadge color={selectedTeam.color} name={selectedTeam.name} className="text-base font-bold justify-center" />
        <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
          {selectedTeam.manager}
          {selectedId === myTeamId && ` ${tt.viewingOwn}`}
        </p>
      </div>

      <div className="space-y-5">
        <section>
          <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-1">{t.roster.slotStarter}</h2>
          <div className="card">
            {starters.length === 0 ? (
              <p className="text-xs text-[var(--text-dim)] py-2">{t.roster.empty}</p>
            ) : (
              starters.map((p) => <PlayerLine key={p.rank} player={p} lang={lang} />)
            )}
          </div>
        </section>

        {bench.length > 0 && (
          <section>
            <h2 className="text-[var(--text-dim)] text-xs font-bold tracking-wide mb-1">{t.roster.slotBench}</h2>
            <div className="card">
              {bench.map((p) => (
                <PlayerLine key={p.rank} player={p} lang={lang} />
              ))}
            </div>
          </section>
        )}

        {irPlayer && (
          <section>
            <h2 className="text-[var(--purple)] text-xs font-bold tracking-wide mb-1">{t.roster.slotIR}</h2>
            <div className="card">
              <PlayerLine player={irPlayer} lang={lang} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
