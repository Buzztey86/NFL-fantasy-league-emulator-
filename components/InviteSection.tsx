"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useLeagueContext } from "@/lib/league/LeagueContext";
import { useLang } from "@/lib/i18n/LanguageContext";
import type { Team } from "@/lib/types";

export function InviteSection({ teams }: { teams: Team[] }) {
  const { t } = useLang();
  const s = t.setup;
  const { activeLeagueId } = useLeagueContext();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<{ teamId: number }[]>([]);

  useEffect(() => {
    if (!supabaseConfigured || !supabase || !activeLeagueId) return;
    supabase
      .from("leagues")
      .select("invite_code")
      .eq("id", activeLeagueId)
      .maybeSingle()
      .then(({ data }) => setInviteCode(data?.invite_code ?? null));
    supabase
      .from("league_members")
      .select("team_id")
      .eq("league_id", activeLeagueId)
      .then(({ data }) => setMembers((data ?? []).map((m) => ({ teamId: m.team_id }))));
  }, [activeLeagueId]);

  if (!supabaseConfigured) {
    return (
      <section className="card mb-6">
        <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">{s.inviteTitle}</h2>
        <p className="text-xs text-[var(--text-dim)]">{s.inviteNotAvailable}</p>
      </section>
    );
  }

  const inviteUrl = inviteCode && typeof window !== "undefined" ? `${window.location.origin}/invite/${inviteCode}` : null;

  function copyLink() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="card mb-6">
      <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">{s.inviteTitle}</h2>
      <p className="text-xs text-[var(--text-dim)] mb-3">{s.inviteDesc}</p>
      {inviteUrl && (
        <div className="flex items-center gap-2 mb-4">
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
      <h3 className="text-[11px] text-[var(--text-dim)] font-bold tracking-wide mb-2">{s.currentMembers}</h3>
      <div className="space-y-1">
        {teams.map((team) => {
          const claimed = members.some((m) => m.teamId === team.id);
          return (
            <div key={team.id} className="flex justify-between text-xs">
              <span style={{ color: team.color }}>{team.name}</span>
              <span className={claimed ? "text-[var(--green)]" : "text-[var(--text-dim)]"}>{claimed ? "👤" : "🤖"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
