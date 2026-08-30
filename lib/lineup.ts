import type { Player, Position } from "./types";

export interface Lineup {
  QB: number | null;
  RB1: number | null;
  RB2: number | null;
  WR1: number | null;
  WR2: number | null;
  TE: number | null;
  FLEX: number | null;
  DST: number | null;
  K: number | null;
}

export const LINEUP_SLOTS: (keyof Lineup)[] = ["QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX", "DST", "K"];

/** Welche Positionen für einen Slot in Frage kommen (FLEX = RB/WR/TE). */
export const SLOT_ELIGIBLE_POS: Record<keyof Lineup, Position[]> = {
  QB: ["QB"],
  RB1: ["RB"],
  RB2: ["RB"],
  WR1: ["WR"],
  WR2: ["WR"],
  TE: ["TE"],
  FLEX: ["RB", "WR", "TE"],
  DST: ["DST"],
  K: ["K"],
};

/** Wählt automatisch die beste Aufstellung nach Projektion (proj-Feld). Flex = bester Rest aus RB/WR/TE. */
export function autoLineup(roster: Player[]): Lineup {
  const byPos = (pos: Position) => roster.filter((p) => p.pos === pos).sort((a, b) => b.proj - a.proj);
  const used = new Set<number>();
  const pick = (pool: Player[]): number | null => {
    const p = pool.find((x) => !used.has(x.rank));
    if (p) used.add(p.rank);
    return p?.rank ?? null;
  };

  const qbs = byPos("QB");
  const rbs = byPos("RB");
  const wrs = byPos("WR");
  const tes = byPos("TE");
  const dsts = byPos("DST");
  const ks = byPos("K");

  const QB = pick(qbs);
  const RB1 = pick(rbs);
  const RB2 = pick(rbs);
  const WR1 = pick(wrs);
  const WR2 = pick(wrs);
  const TE = pick(tes);
  const flexPool = [...rbs, ...wrs, ...tes].filter((p) => !used.has(p.rank)).sort((a, b) => b.proj - a.proj);
  const FLEX = pick(flexPool);
  const DST = pick(dsts);
  const K = pick(ks);

  return { QB, RB1, RB2, WR1, WR2, TE, FLEX, DST, K };
}
