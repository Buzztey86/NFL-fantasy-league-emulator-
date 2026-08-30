import type { DraftPick, Team } from "./types";
import type { Transaction } from "./roster";
import { getPlayerByRank } from "./players";

export type ActivityEntry =
  | { id: string; timestamp: string | null; kind: "draft"; teamId: number; playerName: string; pickNumber: number; round: number }
  | { id: string; timestamp: string; kind: "waiver"; teamId: number; addedName: string; droppedName: string | null; faab: number }
  | { id: string; timestamp: string; kind: "trade"; teamAId: number; teamBId: number; teamAGivesNames: string[]; teamBGivesNames: string[] };

export function buildActivityFeed(draftLog: DraftPick[], transactions: Transaction[]): ActivityEntry[] {
  const txEntries: ActivityEntry[] = [];

  for (const tx of transactions) {
    if (tx.type === "waiver_add" && tx.teamId != null && tx.addPlayerRank != null) {
      txEntries.push({
        id: tx.id,
        timestamp: tx.timestamp,
        kind: "waiver",
        teamId: tx.teamId,
        addedName: getPlayerByRank(tx.addPlayerRank).name,
        droppedName: tx.dropPlayerRank != null ? getPlayerByRank(tx.dropPlayerRank).name : null,
        faab: tx.faabSpent ?? 0,
      });
    } else if (tx.type === "trade" && tx.teamAId != null && tx.teamBId != null) {
      txEntries.push({
        id: tx.id,
        timestamp: tx.timestamp,
        kind: "trade",
        teamAId: tx.teamAId,
        teamBId: tx.teamBId,
        teamAGivesNames: (tx.teamAGives ?? []).map((r) => getPlayerByRank(r).name),
        teamBGivesNames: (tx.teamBGives ?? []).map((r) => getPlayerByRank(r).name),
      });
    }
  }
  txEntries.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));

  const draftEntries: ActivityEntry[] = [...draftLog]
    .sort((a, b) => b.pickNumber - a.pickNumber)
    .map((pick) => ({
      id: `draft-${pick.pickNumber}`,
      timestamp: pick.timestamp ?? null,
      kind: "draft" as const,
      teamId: pick.teamId,
      playerName: getPlayerByRank(pick.playerRank).name,
      pickNumber: pick.pickNumber,
      round: pick.round,
    }));

  return [...txEntries, ...draftEntries];
}

export function teamById(teams: Team[], id: number): Team | undefined {
  return teams.find((t) => t.id === id);
}
