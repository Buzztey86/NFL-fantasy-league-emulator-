"use client";

import Link from "next/link";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { useLeagueState } from "@/lib/useLeagueState";
import { withMemberOwnership } from "@/lib/league/resolveTeams";
import { buildActivityFeed, teamById } from "@/lib/activity";
import { useLang } from "@/lib/i18n/LanguageContext";

export default function ActivityPage() {
  const { activeLeagueId, loading: leagueCtxLoading, loadError } = useLeagueContext();
  const { state, members, loading, cloudSynced } = useLeagueState(activeLeagueId);
  const { t } = useLang();
  const a = t.activity;
  const c = t.common;

  if (loadError) {
    return <main className="p-8 text-[var(--red)] text-sm">{loadError}</main>;
  }
  if (leagueCtxLoading || loading || !state) {
    return <main className="p-8 text-[var(--text-muted)]">{c.loadingLeague}</main>;
  }

  const teams = withMemberOwnership(state.teams, members);
  const feed = buildActivityFeed(state.draftLog, state.transactions);

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
          {a.heading}
        </h1>
        <p className="text-xs text-[var(--text-dim)] mt-2">{a.subtitle}</p>
      </header>

      {feed.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-dim)]">{a.empty}</p>
      ) : (
        <div className="space-y-2">
          {feed.map((entry) => {
            if (entry.kind === "draft") {
              const team = teamById(teams, entry.teamId);
              return (
                <div key={entry.id} className="card !py-2.5 text-sm">
                  <span style={{ color: team?.color }} className="font-semibold">
                    {team?.name}
                  </span>{" "}
                  {a.drafted} <span className="text-[var(--text-primary)]">{entry.playerName}</span>{" "}
                  <span className="text-[var(--text-dim)] text-xs">
                    ({a.pick} {entry.pickNumber}, R{entry.round})
                  </span>
                </div>
              );
            }
            if (entry.kind === "waiver") {
              const team = teamById(teams, entry.teamId);
              return (
                <div key={entry.id} className="card !py-2.5 text-sm">
                  <span style={{ color: team?.color }} className="font-semibold">
                    {team?.name}
                  </span>{" "}
                  {a.addedVia} <span className="text-[var(--text-primary)]">{entry.addedName}</span>{" "}
                  <span className="text-[var(--gold)] text-xs">(${entry.faab})</span>
                  {entry.droppedName && (
                    <div className="text-xs text-[var(--text-dim)] mt-0.5">
                      {a.droppedFor} {entry.droppedName}
                    </div>
                  )}
                </div>
              );
            }
            const teamA = teamById(teams, entry.teamAId);
            const teamB = teamById(teams, entry.teamBId);
            return (
              <div key={entry.id} className="card !py-2.5 text-sm">
                <div className="text-xs text-[var(--purple)] mb-1">
                  {a.tradeBetween} <span style={{ color: teamA?.color }}>{teamA?.name}</span> &amp;{" "}
                  <span style={{ color: teamB?.color }}>{teamB?.name}</span>
                </div>
                <div className="text-xs">
                  <span style={{ color: teamA?.color }}>{teamA?.name}</span> {a.gives} {entry.teamAGivesNames.join(", ") || "—"}
                </div>
                <div className="text-xs">
                  <span style={{ color: teamB?.color }}>{teamB?.name}</span> {a.gives} {entry.teamBGivesNames.join(", ") || "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
