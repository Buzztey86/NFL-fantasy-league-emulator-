import type { Player, Position } from "./types";
import rawPlayers from "@/data/players.json";

// ── Echter Datensatz ─────────────────────────────────────────────────────────
// 207 reale Spieler (Rang 1-200 Offense: Rotoworld/NBC Sports Consensus,
// Stand 26.08.2026, cross-checked gegen CBS Sports Consensus; Rang 201-207
// DST/K aus der ursprünglichen Stichprobe). Deckt den kompletten 15-Runden-
// Draft (150 Picks) mit Puffer ab. 39 Spieler tragen zusätzlich echte,
// handgeschriebene Scouting-Notizen (Feld `curated: true`); der Rest hat
// automatisch berechnete proj/floor/upside/radar-Werte (`curated: false`).
// Bye-Wochen sind für die nicht-kuratierten Spieler noch nicht erfasst (bye=0)
// statt erfunden — siehe README für den Nachpflege-Hinweis.
//
// getPlayerPool() erzeugt darüber hinaus generische Replacement-Level-Spieler
// für Ränge >207, damit der Draft auch in einem Extremfall nie hängen bleibt.
export const REAL_PLAYERS: Player[] = rawPlayers as Player[];

const POSITION_CYCLE: Position[] = ["RB", "WR", "WR", "RB", "TE", "QB", "DST", "K"];

/**
 * Erzeugt einen plausiblen Replacement-Level-Spieler für Ränge, die im echten
 * Datensatz nicht existieren. Wird nur genutzt, wenn REAL_PLAYERS erschöpft ist.
 */
function generateFillerPlayer(rank: number): Player {
  const pos = POSITION_CYCLE[rank % POSITION_CYCLE.length];
  const decay = Math.max(5, 60 - Math.floor(rank / 3));
  return {
    rank,
    pos,
    name: `Waiver-Level ${pos} #${rank}`,
    team: "FA",
    age: 26,
    adp: rank,
    proj: decay,
    floor: Math.max(1, Math.floor(decay * 0.4)),
    upside: Math.floor(decay * 1.3),
    bye: (rank % 14) + 1,
    radar: [50, 50, 50, 50, 50, 50],
    note: "Platzhalter-Spieler — echte Scouting-Daten fehlen noch für diesen Rang.",
    tags: ["Platzhalter"],
    generated: true,
  };
}

export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

let cachedPool: Player[] | null = null;

/** Vollständiger Spieler-Pool (echte + generierte Auffüll-Spieler), nach Rang sortiert. */
export function getPlayerPool(maxRank = 250): Player[] {
  if (cachedPool && cachedPool.length >= maxRank) return cachedPool;
  const byRank = new Map<number, Player>();
  for (const p of REAL_PLAYERS) byRank.set(p.rank, p);
  const pool: Player[] = [];
  for (let r = 1; r <= maxRank; r++) {
    pool.push(byRank.get(r) ?? generateFillerPlayer(r));
  }
  cachedPool = pool;
  return pool;
}

export function getAvailablePlayers(draftedRanks: Set<number>, maxRank = 250): Player[] {
  return getPlayerPool(maxRank).filter((p) => !draftedRanks.has(p.rank));
}

export function getPlayerByRank(rank: number): Player {
  return getPlayerPool(Math.max(rank, 250)).find((p) => p.rank === rank) ?? generateFillerPlayer(rank);
}
