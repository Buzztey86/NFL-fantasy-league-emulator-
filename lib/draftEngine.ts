import type { DraftPick, Player, PersonalityId, Position, Team } from "./types";
import { NUM_TEAMS, TOTAL_ROUNDS, TOTAL_PICKS } from "./types";
import { getPlayerByRank } from "./players";

// ── Snake-Draft-Reihenfolge ──────────────────────────────────────────────────
// order[i] = teamId, das den (i+1)-ten Overall-Pick macht (0-indiziert).
export function buildDraftOrder(numTeams = NUM_TEAMS, rounds = TOTAL_ROUNDS): number[] {
  const order: number[] = [];
  for (let r = 0; r < rounds; r++) {
    const round = Array.from({ length: numTeams }, (_, i) => i);
    if (r % 2 === 1) round.reverse();
    order.push(...round);
  }
  return order;
}

export function pickNumberToRound(pickNumber: number, numTeams = NUM_TEAMS): number {
  return Math.ceil(pickNumber / numTeams);
}

export function getTeamIdForPick(pickNumber: number, order: number[]): number {
  return order[pickNumber - 1];
}

export function isDraftComplete(draftLog: DraftPick[]): boolean {
  return draftLog.length >= TOTAL_PICKS;
}

export function getNextPickNumber(draftLog: DraftPick[]): number {
  return draftLog.length + 1;
}

// ── Roster-Helfer ────────────────────────────────────────────────────────────

export function getRosterForTeam(teamId: number, draftLog: DraftPick[]): Player[] {
  return draftLog.filter((p) => p.teamId === teamId).map((p) => getPlayerByRank(p.playerRank));
}

export function countPositions(roster: Player[]): Record<Position, number> {
  const counts: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0 };
  for (const p of roster) counts[p.pos]++;
  return counts;
}

// ── KI-Entscheidungslogik ────────────────────────────────────────────────────
// Jede Persönlichkeit bekommt eine Score-Funktion. Der Draft-Engine wählt den
// verfügbaren Spieler mit dem höchsten Score. Basiswert ist immer -rank (=
// besserer Rang ist besser), Persönlichkeiten verschieben diesen Wert gezielt.

function tagBonus(player: Player, tags: string[], amount: number): number {
  return player.tags.some((t) => tags.includes(t)) ? amount : 0;
}

function personalityScore(
  personality: PersonalityId,
  player: Player,
  round: number,
  roster: Player[],
  rngSeed: number
): number {
  const base = -player.rank;
  const counts = countPositions(roster);
  const pseudoRandom = Math.sin(rngSeed * 12.9898 + player.rank * 78.233) * 43758.5453;
  const noise = pseudoRandom - Math.floor(pseudoRandom); // 0..1, deterministisch reproduzierbar

  switch (personality) {
    case "analytics":
      // Streng ADP-basiert, keine Reaches — reiner Best-Player-Available.
      return base;

    case "cowboys":
      // Reach-heavy: bevorzugt Tier-1/Upside-Tags, akzeptiert Reaches.
      return base + tagBonus(player, ["Tier 1", "Elite", "Upside"], 6) + noise * 4;

    case "purple_dynasty":
      // Floor/Konsistenz über Volatilität.
      return base + player.floor * 0.8 + tagBonus(player, ["Safe", "Floor-Monster"], 5);

    case "chaos":
      // Hype-getrieben, unberechenbar — starkes Rauschen.
      return base + noise * 14 + tagBonus(player, ["Breakout", "Upside", "Boom/Bust"], 5);

    case "iron_curtain":
      // Überschätzt QB/DST massiv, vor allem früh.
      if (player.pos === "QB") return base + 20;
      if (player.pos === "DST" && round >= 4) return base + 25;
      return base - 3;

    case "sleeper":
      // Ignoriert Top-ADP, sucht Sleeper — meidet in frühen Runden bewusst die
      // Spitze des verfügbaren Feldes und bevorzugt Value-Gap (adp > rank).
      if (round <= 6 && player.rank <= 8) return base - 15;
      return base + Math.max(0, player.adp - player.rank) * 1.5;

    case "old_school":
      // Nimmt in Runde 1–3 fast ausschließlich RBs.
      if (round <= 3) return player.pos === "RB" ? base + 15 : base - 20;
      return base + (player.pos === "RB" ? 4 : 0);

    case "zero_rb":
      // Zero-RB: meidet RB in den ersten Runden, WR/TE bevorzugt.
      if (round <= 3) return player.pos === "RB" ? base - 20 : base + 8;
      return base;

    case "dynasty_builder":
      // Bevorzugt junge Spieler / Rookies.
      return base + Math.max(0, 30 - player.age) * 1.2;

    default:
      return base;
  }
}

/** Soft-Caps, damit keine KI z.B. 4 Kicker in Folge draftet. */
function violatesSoftCap(player: Player, counts: Record<Position, number>, round: number): boolean {
  if (player.pos === "K" && (counts.K >= 1 || round < 9)) return true;
  if (player.pos === "DST" && (counts.DST >= 1 || round < 6)) return true;
  if (player.pos === "QB" && counts.QB >= 2) return true;
  if (player.pos === "TE" && counts.TE >= 2) return true;
  return false;
}

export function pickForAITeam(team: Team, round: number, available: Player[], roster: Player[]): Player {
  let candidates = available.filter((p) => !violatesSoftCap(p, countPositions(roster), round));
  if (candidates.length === 0) candidates = available; // Notfall: Soft-Caps ignorieren statt zu blockieren

  // Nur die besten ~40 verfügbaren Spieler betrachten (Performance + Realismus:
  // niemand erwägt ernsthaft Rang 300, wenn Rang 40 frei ist).
  const pool = candidates.slice(0, 40);

  let best = pool[0];
  let bestScore = -Infinity;
  for (const p of pool) {
    const score = personalityScore(team.personality, p, round, roster, team.id + p.rank);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}
