import type { GameResult } from "./nflStats";

export interface ScorePrediction {
  home: number;
  away: number;
}

function winnerOf(home: number, away: number): "home" | "away" | "tie" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "tie";
}

/**
 * 3 Punkte: exakter Endstand.
 * 2 Punkte: richtige Punktedifferenz (impliziert auch den richtigen Gewinner,
 * außer bei einem getippten Unentschieden).
 * 1 Punkt: nur der Gewinner stimmt, Differenz nicht.
 * 0 Punkte: sonst.
 */
export function scoreGamePrediction(pred: ScorePrediction, actualHome: number, actualAway: number): number {
  if (pred.home === actualHome && pred.away === actualAway) return 3;
  const predDiff = pred.home - pred.away;
  const actualDiff = actualHome - actualAway;
  if (predDiff === actualDiff) return 2;
  if (winnerOf(pred.home, pred.away) === winnerOf(actualHome, actualAway)) return 1;
  return 0;
}

export interface WeekScore {
  points: number;
  gamesScored: number;
}

export function computeWeekScore(picks: Record<string, ScorePrediction> | undefined, games: GameResult[]): WeekScore {
  if (!picks) return { points: 0, gamesScored: 0 };
  let points = 0;
  let gamesScored = 0;
  for (const game of games) {
    if (!game.completed) continue;
    const pred = picks[game.id];
    if (!pred) continue;
    gamesScored++;
    points += scoreGamePrediction(pred, game.homeScore, game.awayScore);
  }
  return { points, gamesScored };
}
