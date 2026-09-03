import type { GameResult } from "./nflStats";

export interface WeekScore {
  correct: number;
  total: number;
}

/** picks: gameId -> getipptes Team-Kürzel. Unentschieden (selten in der NFL) zählen für niemanden. */
export function computeWeekScore(picks: Record<string, string> | undefined, games: GameResult[]): WeekScore {
  if (!picks) return { correct: 0, total: 0 };
  let correct = 0;
  let total = 0;
  for (const game of games) {
    if (!game.completed) continue;
    const pick = picks[game.id];
    if (!pick) continue;
    total++;
    if (game.homeScore === game.awayScore) continue;
    const winner = game.homeScore > game.awayScore ? game.home : game.away;
    if (pick === winner) correct++;
  }
  return { correct, total };
}
