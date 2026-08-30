"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { useLang } from "@/lib/i18n/LanguageContext";
import { personaByPersonality } from "@/lib/personas";
import type { LeagueState, Team } from "@/lib/types";

export function InviteSection({ state, save }: { state: LeagueState; save: (next: LeagueState) => Promise<void> }) {
  const { t } = useLang();
  const s = t.setup;
  const { activeLeagueId, activeMembership, refresh } = useLeagueContext();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerated, setRegenerated] = useState(false);
  const [members, setMembers] = useState<{ teamId: number }[]>([]);

  const teams = state.teams;

  useEffect(() => {
    if (!supabaseConfigured || !supabase || !activeLeagueId) return;
    loadInviteCode();
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeagueId]);

  function loadInviteCode() {
    supabase
      ?.from("leagues")
      .select("invite_code")
      .eq("id", activeLeagueId)
      .maybeSingle()
      .then(({ data }) => setInviteCode(data?.invite_code ?? null));
  }

  function loadMembers() {
    supabase
      ?.from("league_members")
      .select("team_id")
      .eq("league_id", activeLeagueId)
      .then(({ data }) => setMembers((data ?? []).map((m) => ({ teamId: m.team_id }))));
  }

  if (!supabaseConfigured) {
    return (
      <section className="card mb-6">
        <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">{s.inviteTitle}</h2>
        <p className="text-xs text-[var(--text-dim)]">{s.inviteNotAvailable}</p>
      </section>
    );
  }

  const inviteUrl = inviteCode && typeof window !== "undefined" ? `${window.location.origin}/invite/${inviteCode}` : null;
  const isOwner = Boolean(activeMembership?.isOwner);

  function copyLink() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateLink() {
    if (!supabase || !activeLeagueId) return;
    const newCode = crypto.randomUUID().slice(0, 8);
    await supabase.from("leagues").update({ invite_code: newCode }).eq("id", activeLeagueId);
    setInviteCode(newCode);
    setRegenerated(true);
    setTimeout(() => setRegenerated(false), 2000);
  }

  async function removeMember(team: Team) {
    if (!supabase || !activeLeagueId) return;
    if (!confirm(s.removeConfirm)) return;

    await supabase.from("league_members").delete().eq("league_id", activeLeagueId).eq("team_id", team.id);

    // Team-Anzeige auf eine KI-Persönlichkeit zurücksetzen (die ursprünglich
    // hinterlegte AI-Persona für diesen Slot ist nicht mehr bekannt, sobald
    // sie überschrieben wurde -> nimmt die Analytics-Persona als neutralen
    // Fallback, klar besser als den Menschen-Namen zu behalten).
    const fallback = personaByPersonality("analytics");
    const updatedTeams = teams.map((tm) =>
      tm.id === team.id ? { ...tm, name: fallback.name, manager: fallback.manager, personality: fallback.personality, isHuman: false } : tm
    );
    await save({ ...state, teams: updatedTeams });
    await refresh();
    loadMembers();
  }

  return (
    <section className="card mb-6">
      <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">{s.inviteTitle}</h2>
      <p className="text-xs text-[var(--text-dim)] mb-3">{s.inviteDesc}</p>
      {inviteUrl && (
        <div className="flex items-center gap-2 mb-2">
          <input
            readOnly
            value={inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-3 py-2 text-xs text-[var(--text-secondary)] font-mono"
          />
          <button onClick={copyLink} className="shrink-0 px-3 py-2 rounded-md text-xs font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)]">
            {copied ? s.copied : s.copyLink}
          </button>
        </div>
      )}
      {isOwner && (
        <div className="mb-4">
          <button onClick={regenerateLink} className="text-[11px] text-[var(--text-dim)] underline">
            {regenerated ? s.regenerated : s.regenerateLink}
          </button>
        </div>
      )}
      <h3 className="text-[11px] text-[var(--text-dim)] font-bold tracking-wide mb-2">{s.currentMembers}</h3>
      <div className="space-y-1.5">
        {teams.map((team) => {
          const claimed = members.some((m) => m.teamId === team.id);
          return (
            <div key={team.id} className="flex items-center justify-between text-xs">
              <span style={{ color: team.color }}>{team.name}</span>
              <div className="flex items-center gap-2">
                <span className={claimed ? "text-[var(--green)]" : "text-[var(--text-dim)]"}>{claimed ? "👤" : "🤖"}</span>
                {isOwner && claimed && (
                  <button onClick={() => removeMember(team)} className="text-[10px] text-[var(--red)] underline">
                    {s.remove}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
