// The Gridiron Oracle League — zentrale Typdefinitionen
// Diese Typen spiegeln 1:1 die Datenstruktur aus 07_DRAFTBOARD_DATA.md / draftboard-2026.html

import type { Transaction } from "./roster";

export type Position = "QB" | "RB" | "WR" | "TE" | "DST" | "K";

export interface Player {
  rank: number;
  pos: Position;
  name: string;
  team: string;
  age: number;
  adp: number;
  proj: number;
  floor: number;
  upside: number;
  bye: number;
  radar: number[];
  note: string;
  tags: string[];
  /** true = wurde vom Draft-Engine generiert, weil der reale Datensatz an dieser Stelle erschöpft war */
  generated?: boolean;
}

export type PersonalityId =
  | "human"
  | "analytics"
  | "cowboys"
  | "purple_dynasty"
  | "chaos"
  | "iron_curtain"
  | "sleeper"
  | "old_school"
  | "zero_rb"
  | "dynasty_builder";

export interface Team {
  /** id bestimmt den festen Slot im Snake Draft: id 0 = Pick 1 in Runde 1, id 1 = Pick 2, usw. */
  id: number;
  name: string;
  manager: string;
  color: string;
  isHuman: boolean;
  personality: PersonalityId;
}

export interface DraftPick {
  pickNumber: number; // 1-basiert, überall (Overall Pick)
  round: number; // 1-basiert
  teamId: number;
  playerRank: number;
}

export interface LeagueState {
  teams: Team[];
  draftLog: DraftPick[]; // Reihenfolge = Pick-Reihenfolge
  transactions: Transaction[];
  faab: Record<number, number>; // teamId -> verbleibendes FAAB-Budget
  updatedAt: string;
}

export const STARTING_FAAB = 100;

export const ROSTER_SLOTS: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1, // RB/WR/TE
  DST: 1,
  K: 1,
  BENCH: 6,
};

export const TOTAL_ROUNDS = 15;
export const NUM_TEAMS = 10;
export const TOTAL_PICKS = TOTAL_ROUNDS * NUM_TEAMS;
export const REGULAR_SEASON_WEEKS = 14;

export interface SeasonGame {
  week: number;
  homeTeamId: number;
  awayTeamId: number;
}

export interface TeamWeekScore {
  total: number;
  slots: { slot: string; player: string | null; pos: string | null; points: number }[];
}

export interface SeasonState {
  seasonYear: number;
  schedule: SeasonGame[];
  // lineups[week][teamId] = { QB: rank|null, ... }
  lineups: Record<number, Record<number, Record<string, number | null>>>;
  // weeklyScores[week][teamId] = TeamWeekScore
  weeklyScores: Record<number, Record<number, TeamWeekScore>>;
  updatedAt: string;
}
