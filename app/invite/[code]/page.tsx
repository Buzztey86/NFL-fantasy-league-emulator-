"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useLeagueContext } from "@/lib/league/LeagueContext";

interface InviteTeam {
  id: number;
  name: string;
  color: string;
}

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useLang();
  const inv = t.invite;
  const { userId, refresh, setActiveLeagueId } = useLeagueContext();

  const [loading, setLoading] = useState(true);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [teams, setTeams] = useState<InviteTeam[]>([]);
  const [claimedTeamIds, setClaimedTeamIds] = useState<Set<number>>(new Set());
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinedTeamName, setJoinedTeamName] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabaseConfigured || !supabase || !userId) return;

      const { data, error } = await supabase.rpc("get_invite_preview", { p_invite_code: code }).maybeSingle<{
        league_id: string;
        league_name: string;
        teams: InviteTeam[];
        claimed_team_ids: number[];
      }>();
      if (error || !data || !data.league_id) {
        setLoading(false);
        return;
      }
      setLeagueId(data.league_id);
      setTeams(data.teams ?? []);
      setClaimedTeamIds(new Set(data.claimed_team_ids ?? []));

      // Prüfen, ob wir selbst schon Mitglied sind (eigene Mitgliedschaften kennt der LeagueContext bereits).
      const { data: mine } = await supabase.from("league_members").select("league_id").eq("league_id", data.league_id).eq("user_id", userId).maybeSingle();
      setAlreadyMember(Boolean(mine));

      setLoading(false);
    }
    load();
  }, [code, userId]);

  async function confirmJoin() {
    if (!supabase || !leagueId || !userId || selectedTeamId == null) return;
    if (!teamName.trim()) {
      setNameError(inv.nameRequired);
      return;
    }
    setJoining(true);

    const { error: joinError } = await supabase.rpc("join_league", {
      p_invite_code: code,
      p_team_id: selectedTeamId,
      p_team_name: teamName.trim(),
      p_manager_name: managerName.trim(),
    });

    if (!joinError) {
      setActiveLeagueId(leagueId);
      await refresh();
      setJoinedTeamName(teamName.trim());
    } else {
      setNameError(joinError.message);
    }
    setJoining(false);
  }

  if (!supabaseConfigured) {
    return <main className="p-8 text-center text-[var(--text-muted)]">{t.login.notConfigured}</main>;
  }

  if (loading || !userId) {
    return <LoadingScreen text={inv.loading} />;
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

  const selectedTeam = teams.find((tm) => tm.id === selectedTeamId) ?? null;

  return (
    <main className="mx-auto max-w-[500px] px-6 py-10">
      <h1
        className="hero-gradient-text font-black text-center mb-6"
        style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}
      >
        {inv.heading}
      </h1>

      {selectedTeam ? (
        <div className="card">
          <button onClick={() => setSelectedTeamId(null)} className="text-xs text-[var(--text-dim)] mb-4">
            {inv.back}
          </button>
          <div className="text-sm mb-4">
            <span className="text-[var(--text-dim)]">{inv.currentAiTeam}: </span>
            <span style={{ color: selectedTeam.color }} className="font-semibold">
              {selectedTeam.name}
            </span>
          </div>

          <label className="block text-xs text-[var(--text-dim)] mb-1">{inv.yourTeamName}</label>
          <input
            value={teamName}
            onChange={(e) => {
              setTeamName(e.target.value);
              setNameError(null);
            }}
            placeholder={inv.yourTeamNamePlaceholder}
            className="w-full mb-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)]"
          />

          <label className="block text-xs text-[var(--text-dim)] mb-1">{inv.yourManagerName}</label>
          <input
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder={inv.yourManagerNamePlaceholder}
            className="w-full mb-4 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)]"
          />

          {nameError && <p className="text-xs text-[var(--red)] mb-3">{nameError}</p>}

          <button
            onClick={confirmJoin}
            disabled={joining}
            className="w-full px-4 py-2.5 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-50"
          >
            {joining ? "…" : inv.confirmJoin}
          </button>
        </div>
      ) : (
        <>
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
                    onClick={() => setSelectedTeamId(team.id)}
                    disabled={claimed}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-30"
                  >
                    {inv.joinButton}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
