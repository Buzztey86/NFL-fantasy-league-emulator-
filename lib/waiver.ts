import type { Player, PersonalityId, Team } from "./types";
import type { Transaction } from "./roster";
import { getCurrentRoster, getAllRosteredRanks, MAX_ROSTER_SIZE } from "./roster";
import { getAvailablePlayers } from "./players";
import { pickForAITeam } from "./draftEngine";

export interface WaiverClaim {
  id: string;
  teamId: number;
  addPlayerRank: number;
  dropPlayerRank: number | null;
  bidAmount: number;
  week: number;
}

/** Persönlichkeits-typisches FAAB-Gebot als Anteil des Restbudgets. */
function personalityBidFraction(personality: PersonalityId): [number, number] {
  switch (personality) {
    case "cowboys":
      return [0.15, 0.35]; // überbietet gerne
    case "chaos":
      return [0.08, 0.3]; // unberechenbar
    case "sleeper":
      return [0.1, 0.2]; // gezielt, aber überzeugt
    case "dynasty_builder":
      return [0.08, 0.18];
    case "purple_dynasty":
      return [0.04, 0.1]; // konservativ
    default:
      return [0.05, 0.15];
  }
}

function pickDropCandidate(roster: Player[]): Player | null {
  if (roster.length === 0) return null;
  return [...roster].sort((a, b) => a.proj - b.proj)[0];
}

export function generateAIWaiverClaims(
  teams: Team[],
  draftLog: Parameters<typeof getCurrentRoster>[1],
  transactions: Transaction[],
  faab: Record<number, number>,
  week: number
): WaiverClaim[] {
  const rostered = getAllRosteredRanks(
    teams.map((t) => t.id),
    draftLog,
    transactions
  );
  const freeAgents = getAvailablePlayers(rostered);
  const claims: WaiverClaim[] = [];

  for (const team of teams) {
    if (team.isHuman) continue;
    const budget = faab[team.id] ?? 0;
    if (budget <= 0 || freeAgents.length === 0) continue;

    const roster = getCurrentRoster(team.id, draftLog, transactions);
    // Round=12 -> späte Roster-Auffüll-Logik statt frühe Runden-Spezialregeln (z.B. Franks Zwangs-RB Runde 1-3)
    const target = pickForAITeam(team, 12, freeAgents, roster);
    if (!target) continue;

    const [lo, hi] = personalityBidFraction(team.personality);
    const bid = Math.max(1, Math.min(budget, Math.round(budget * (lo + Math.random() * (hi - lo)))));
    const dropCandidate = roster.length >= MAX_ROSTER_SIZE ? pickDropCandidate(roster) : null;

    claims.push({
      id: crypto.randomUUID(),
      teamId: team.id,
      addPlayerRank: target.rank,
      dropPlayerRank: dropCandidate?.rank ?? null,
      bidAmount: bid,
      week,
    });
  }
  return claims;
}

export interface WaiverResolution {
  transactions: Transaction[];
  faabSpent: Record<number, number>;
  winningClaimIds: Set<string>;
}

/** Höchstes Gebot gewinnt; bei Gleichstand gewinnt das Team mit weniger Siegen (schlechtere Bilanz). */
export function resolveWaivers(claims: WaiverClaim[], winsByTeam: Record<number, number>): WaiverResolution {
  const byPlayer = new Map<number, WaiverClaim[]>();
  for (const c of claims) {
    const arr = byPlayer.get(c.addPlayerRank) ?? [];
    arr.push(c);
    byPlayer.set(c.addPlayerRank, arr);
  }

  const transactions: Transaction[] = [];
  const faabSpent: Record<number, number> = {};
  const winningClaimIds = new Set<string>();

  for (const [, group] of byPlayer) {
    const sorted = [...group].sort((a, b) => {
      if (b.bidAmount !== a.bidAmount) return b.bidAmount - a.bidAmount;
      return (winsByTeam[a.teamId] ?? 0) - (winsByTeam[b.teamId] ?? 0);
    });
    const winner = sorted[0];
    winningClaimIds.add(winner.id);
    transactions.push({
      id: crypto.randomUUID(),
      type: "waiver_add",
      week: winner.week,
      timestamp: new Date().toISOString(),
      teamId: winner.teamId,
      addPlayerRank: winner.addPlayerRank,
      dropPlayerRank: winner.dropPlayerRank,
      faabSpent: winner.bidAmount,
    });
    faabSpent[winner.teamId] = (faabSpent[winner.teamId] ?? 0) + winner.bidAmount;
  }

  return { transactions, faabSpent, winningClaimIds };
}
