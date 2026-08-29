"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import type { Team } from "@/lib/types";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useLang();
  const inv = t.invite;
  const { userId, refresh, setActiveLeagueId } = useLeagueContext();

  const [loading, setLoading] = useState(true);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [claimedTeamIds, setClaimedTeamIds] = useState<Set<number>>(new Set());
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [joining, setJoining] = useState<number | null>(null);
  const [joinedTeamName, setJoinedTeamName] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabaseConfigured || !supabase || !userId) return;

      const { data: league } = await supabase.from("leagues").select("id").eq("invite_code", code).maybeSingle();
      if (!league) {
        setLoading(false);
        return;
      }
      setLeagueId(league.id);

      const { data: members } = await supabase.from("league_members").select("user_id, team_id").eq("league_id", league.id);
      const claimed = new Set((members ?? []).map((m) => m.team_id));
      setClaimedTeamIds(claimed);
      setAlreadyMember((members ?? []).some((m) => m.user_id === userId));

      const { data: leagueState } = await supabase.from("league_state").select("teams").eq("id", league.id).maybeSingle();
      setTeams(leagueState?.teams ?? []);

      setLoading(false);
    }
    load();
  }, [code, userId]);

  async function joinTeam(teamId: number) {
    if (!supabase || !leagueId || !userId) return;
    setJoining(teamId);
    const { error } = await supabase.from("league_members").insert({ league_id: leagueId, user_id: userId, team_id: teamId });
    if (!error) {
      setActiveLeagueId(leagueId);
      await refresh();
      setJoinedTeamName(teams.find((t) => t.id === teamId)?.name ?? null);
    }
    setJoining(null);
  }

  if (!supabaseConfigured) {
    return <main className="p-8 text-center text-[var(--text-muted)]">{t.login.notConfigured}</main>;
  }

  if (loading || !userId) {
    return <main className="p-8 text-center text-[var(--text-muted)]">{inv.loading}</main>;
  }

  if (!leagueId) {
    return <main className="p-8 text-center text-[var(--red)]">{inv.notFound}</main>;
  }

  if (joinedTeamName) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg text-[var(--text-primary)] mb-4">
            {inv.joined} <span className="text-[var(--gold)] font-bold">{joinedTeamName}</span>
          </p>
          <Link href="/" className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)]">
            {inv.goToLeague}
          </Link>
        </div>
      </main>
    );
  }

  if (alreadyMember) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-[var(--text-primary)] mb-1">{inv.alreadyMember}</p>
          <p className="text-sm text-[var(--text-dim)] mb-4">{inv.alreadyMemberDesc}</p>
          <Link href="/" className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)]">
            {inv.goToLeague}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[500px] px-6 py-10">
      <h1
        className="hero-gradient-text font-black text-center mb-6"
        style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}
      >
        {inv.heading}
      </h1>
      <p className="text-sm text-[var(--text-dim)] text-center mb-6">{inv.chooseTeam}</p>
      <div className="space-y-2">
        {teams.map((team) => {
          const claimed = claimedTeamIds.has(team.id);
          return (
            <div key={team.id} className="card flex items-center justify-between">
              <div>
                <div style={{ color: team.color }} className="font-semibold text-sm">
                  {team.name}
                </div>
                <div className="text-[11px] text-[var(--text-dim)]">{claimed ? inv.claimed : inv.available}</div>
              </div>
              <button
                onClick={() => joinTeam(team.id)}
                disabled={claimed || joining !== null}
                className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-30"
              >
                {joining === team.id ? "…" : inv.joinButton}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
