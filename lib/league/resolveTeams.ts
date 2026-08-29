import type { Team } from "../types";
import type { LeagueMemberRow } from "../useLeagueState";
import type { Membership } from "./LeagueContext";

/**
 * Überschreibt team.isHuman anhand der echten Mitgliederliste einer Liga.
 * Im Local-Only-Modus (keine Mitglieder bekannt) bleiben die gespeicherten
 * Flags unangetastet.
 */
export function withMemberOwnership(teams: Team[], members: LeagueMemberRow[]): Team[] {
  if (members.length === 0) return teams;
  const humanTeamIds = new Set(members.map((m) => m.teamId));
  return teams.map((t) => (humanTeamIds.has(t.id) ? { ...t, isHuman: true } : { ...t, isHuman: false }));
}

/** Welches Team steuert die gerade eingeloggte Person? */
export function resolveMyTeamId(activeMembership: Membership | null, teams: Team[], supabaseConfigured: boolean): number {
  if (supabaseConfigured && activeMembership) return activeMembership.teamId;
  return teams.find((t) => t.isHuman)?.id ?? teams[0]?.id ?? 0;
}
