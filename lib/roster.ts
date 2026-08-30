import type { DraftPick } from "./types";
import { getPlayerByRank } from "./players";

export type TransactionType = "waiver_add" | "trade";

export interface Transaction {
  id: string;
  type: TransactionType;
  week: number;
  timestamp: string;
  // waiver_add:
  teamId?: number;
  addPlayerRank?: number | null;
  dropPlayerRank?: number | null;
  faabSpent?: number;
  // trade:
  teamAId?: number;
  teamBId?: number;
  teamAGives?: number[];
  teamBGives?: number[];
}

/** Aktueller Kader = Draft-Ergebnis + alle Transaktionen der Reihe nach angewendet. */
export function getCurrentRosterRanks(teamId: number, draftLog: DraftPick[], transactions: Transaction[]): number[] {
  let roster = draftLog.filter((p) => p.teamId === teamId).map((p) => p.playerRank);
  const sorted = [...transactions].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const tx of sorted) {
    if (tx.type === "waiver_add" && tx.teamId === teamId) {
      if (tx.dropPlayerRank != null) roster = roster.filter((r) => r !== tx.dropPlayerRank);
      if (tx.addPlayerRank != null) roster.push(tx.addPlayerRank);
    } else if (tx.type === "trade") {
      if (tx.teamAId === teamId) {
        roster = roster.filter((r) => !(tx.teamAGives ?? []).includes(r));
        roster.push(...(tx.teamBGives ?? []));
      } else if (tx.teamBId === teamId) {
        roster = roster.filter((r) => !(tx.teamBGives ?? []).includes(r));
        roster.push(...(tx.teamAGives ?? []));
      }
    }
  }
  return roster;
}

export function getCurrentRoster(teamId: number, draftLog: DraftPick[], transactions: Transaction[]) {
  return getCurrentRosterRanks(teamId, draftLog, transactions).map((r) => getPlayerByRank(r));
}

/** Alle Spieler, die aktuell auf IRGENDEINEM Kader stehen (für Free-Agent-Filter). */
export function getAllRosteredRanks(teamIds: number[], draftLog: DraftPick[], transactions: Transaction[]): Set<number> {
  const set = new Set<number>();
  for (const id of teamIds) {
    for (const r of getCurrentRosterRanks(id, draftLog, transactions)) set.add(r);
  }
  return set;
}

export const MAX_ROSTER_SIZE = 16; // 9 Starter + 6 Bank + 1 IR-Slot
