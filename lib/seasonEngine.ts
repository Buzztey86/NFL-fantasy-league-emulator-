import type { Player } from "./types";
import type { Lineup } from "./lineup";
import { LINEUP_SLOTS } from "./lineup";
import type { WeekStatsResult } from "./nflStats";
import { scoreOffensePlayer, scoreKicker, scoreDefense } from "./scoring";
import { normalizePlayerName } from "./players";

export interface SlotResult {
  slot: string;
  player: string | null;
  pos: string | null;
  points: number;
}

export interface TeamWeekResult {
  total: number;
  slots: SlotResult[];
}

export function computeTeamWeekScore(lineup: Lineup, roster: Player[], stats: WeekStatsResult): TeamWeekResult {
  const byRank = new Map(roster.map((p) => [p.rank, p]));
  const slots: SlotResult[] = [];
  let total = 0;

  for (const slot of LINEUP_SLOTS) {
    const rank = lineup[slot];
    const player = rank != null ? byRank.get(rank) : undefined;
    if (!player) {
      slots.push({ slot, player: null, pos: null, points: 0 });
      continue;
    }

    let points = 0;
    if (player.pos === "K") {
      const k = stats.kickers[normalizePlayerName(player.name)];
      points = k ? scoreKicker(k) : 0;
    } else if (player.pos === "DST") {
      const d = stats.defenses[player.team];
      points = d ? scoreDefense(d) : 0;
    } else {
      const s = stats.players[normalizePlayerName(player.name)];
      points = s ? scoreOffensePlayer(s) : 0;
    }

    slots.push({ slot, player: player.name, pos: player.pos, points });
    total += points;
  }

  return { total: Math.round(total * 100) / 100, slots };
}
