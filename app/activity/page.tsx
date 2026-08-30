"use client";

import Link from "next/link";
import { Shuffle, Repeat, ArrowLeftRight } from "lucide-react";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { useLeagueState } from "@/lib/useLeagueState";
import { withMemberOwnership } from "@/lib/league/resolveTeams";
import { buildActivityFeed, teamById } from "@/lib/activity";
import { TeamBadge } from "@/components/TeamBadge";
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
                <div key={entry.id} className="card card-hover flex items-start gap-2 !py-2.5 text-sm">
                  <Shuffle size={14} className="text-[var(--text-dim)] shrink-0 mt-0.5" />
                  <div>
                    <TeamBadge color={team?.color} name={team?.name} className="font-semibold" /> {a.drafted}{" "}
                    <span className="text-[var(--text-primary)]">{entry.playerName}</span>{" "}
                    <span className="text-[var(--text-dim)] text-xs">
                      ({a.pick} {entry.pickNumber}, R{entry.round})
                    </span>
                  </div>
                </div>
              );
            }
            if (entry.kind === "waiver") {
              const team = teamById(teams, entry.teamId);
              return (
                <div key={entry.id} className="card card-hover flex items-start gap-2 !py-2.5 text-sm">
                  <Repeat size={14} className="text-[var(--text-dim)] shrink-0 mt-0.5" />
                  <div>
                    <TeamBadge color={team?.color} name={team?.name} className="font-semibold" /> {a.addedVia}{" "}
                    <span className="text-[var(--text-primary)]">{entry.addedName}</span>{" "}
                    <span className="text-[var(--gold)] text-xs">(${entry.faab})</span>
                    {entry.droppedName && (
                      <div className="text-xs text-[var(--text-dim)] mt-0.5">
                        {a.droppedFor} {entry.droppedName}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            const teamA = teamById(teams, entry.teamAId);
            const teamB = teamById(teams, entry.teamBId);
            return (
              <div key={entry.id} className="card card-hover flex items-start gap-2 !py-2.5 text-sm">
                <ArrowLeftRight size={14} className="text-[var(--purple)] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-[var(--purple)] mb-1 flex items-center gap-1 flex-wrap">
                    {a.tradeBetween} <TeamBadge color={teamA?.color} name={teamA?.name} /> &amp; <TeamBadge color={teamB?.color} name={teamB?.name} />
                  </div>
                  <div className="text-xs flex items-center gap-1 flex-wrap">
                    <TeamBadge color={teamA?.color} name={teamA?.name} /> {a.gives} {entry.teamAGivesNames.join(", ") || "—"}
                  </div>
                  <div className="text-xs flex items-center gap-1 flex-wrap">
                    <TeamBadge color={teamB?.color} name={teamB?.name} /> {a.gives} {entry.teamBGivesNames.join(", ") || "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
