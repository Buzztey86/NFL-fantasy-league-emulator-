import type { Team } from "./types";

export interface ScheduleGame {
  week: number;
  homeTeamId: number;
  awayTeamId: number;
}

/**
 * Erzeugt einen Spielplan per "Circle Method" Round-Robin. Bei 10 Teams
 * ergeben sich 9 eindeutige Runden (jeder gegen jeden einmal). Für die
 * geforderten 14 Wochen werden die ersten 5 Runden nach Runde 9 wiederholt —
 * eine übliche, pragmatische Lösung für Ligen, deren Wochenzahl nicht durch
 * (Teamzahl - 1) teilbar ist.
 */
export function generateSchedule(teamIds: number[], weeks = 14): ScheduleGame[] {
  const n = teamIds.length;
  if (n % 2 !== 0) throw new Error("generateSchedule erwartet eine gerade Teamzahl.");

  const rounds = n - 1;
  const half = n / 2;
  const fixed = teamIds[0];
  let rotating = teamIds.slice(1);

  const uniqueRounds: { home: number; away: number }[][] = [];
  for (let r = 0; r < rounds; r++) {
    const arrangement = [fixed, ...rotating];
    const pairs: { home: number; away: number }[] = [];
    for (let i = 0; i < half; i++) {
      const a = arrangement[i];
      const b = arrangement[n - 1 - i];
      pairs.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }
    uniqueRounds.push(pairs);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  const schedule: ScheduleGame[] = [];
  for (let w = 0; w < weeks; w++) {
    const round = uniqueRounds[w % rounds];
    for (const pair of round) {
      schedule.push({ week: w + 1, homeTeamId: pair.home, awayTeamId: pair.away });
    }
  }
  return schedule;
}

export function gamesForWeek(schedule: ScheduleGame[], week: number): ScheduleGame[] {
  return schedule.filter((g) => g.week === week);
}

export function opponentFor(schedule: ScheduleGame[], teamId: number, week: number): number | null {
  const game = schedule.find((g) => g.week === week && (g.homeTeamId === teamId || g.awayTeamId === teamId));
  if (!game) return null;
  return game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId;
}

export function teamRecord(
  teams: Team[],
  schedule: ScheduleGame[],
  weeklyScores: Record<number, Record<number, number | { total: number }>>
) {
  const record: Record<number, { w: number; l: number; t: number; pf: number; pa: number }> = {};
  for (const t of teams) record[t.id] = { w: 0, l: 0, t: 0, pf: 0, pa: 0 };

  const toNumber = (v: number | { total: number } | undefined): number | null => {
    if (v == null) return null;
    return typeof v === "number" ? v : v.total;
  };

  for (const game of schedule) {
    const weekScores = weeklyScores[game.week];
    if (!weekScores) continue;
    const homeScore = toNumber(weekScores[game.homeTeamId]);
    const awayScore = toNumber(weekScores[game.awayTeamId]);
    if (homeScore == null || awayScore == null) continue;

    record[game.homeTeamId].pf += homeScore;
    record[game.homeTeamId].pa += awayScore;
    record[game.awayTeamId].pf += awayScore;
    record[game.awayTeamId].pa += homeScore;

    if (homeScore > awayScore) {
      record[game.homeTeamId].w++;
      record[game.awayTeamId].l++;
    } else if (awayScore > homeScore) {
      record[game.awayTeamId].w++;
      record[game.homeTeamId].l++;
    } else {
      record[game.homeTeamId].t++;
      record[game.awayTeamId].t++;
    }
  }
  return record;
}
