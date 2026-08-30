import type { Team, SeasonState } from "./types";
import { teamRecord, type ScheduleGame } from "./schedule";

export const PLAYOFF_TEAMS = 6;
export const PLAYOFF_WEEKS = [15, 16, 17] as const;
export const REGULAR_SEASON_CUTOFF_WEEK = 14;

/** Ermittelt die Top-6-Seeds nach Abschluss der regulären Saison (Wochen 1-14). */
export function getPlayoffSeeds(teams: Team[], schedule: ScheduleGame[], weeklyScores: SeasonState["weeklyScores"]): number[] {
  const regularSeasonSchedule = schedule.filter((g) => g.week <= REGULAR_SEASON_CUTOFF_WEEK);
  const rec = teamRecord(teams, regularSeasonSchedule, weeklyScores);
  return teams
    .map((t) => ({ id: t.id, ...rec[t.id] }))
    .sort((a, b) => b.w - a.w || b.pf - a.pf)
    .slice(0, PLAYOFF_TEAMS)
    .map((t) => t.id);
}

function winner(weeklyScores: SeasonState["weeklyScores"], week: number, teamA: number, teamB: number): number | null {
  const a = weeklyScores[week]?.[teamA]?.total;
  const b = weeklyScores[week]?.[teamB]?.total;
  if (a == null || b == null) return null;
  return a >= b ? teamA : teamB;
}

export interface PlayoffMatchup {
  home: number;
  away: number;
  roundLabel: "quarterfinal" | "semifinal" | "championship";
}

/**
 * Liefert die Playoff-Begegnungen für eine gegebene Woche (15/16/17).
 * Runde 2+ kann erst berechnet werden, wenn die Vorrunde vollständig
 * ausgewertet ist (leeres Array = "noch nicht bekannt").
 */
export function getPlayoffMatchupsForWeek(seeds: number[], weeklyScores: SeasonState["weeklyScores"], week: number): PlayoffMatchup[] {
  if (seeds.length < PLAYOFF_TEAMS) return [];
  const [s1, s2, s3, s4, s5, s6] = seeds;

  if (week === 15) {
    return [
      { home: s3, away: s6, roundLabel: "quarterfinal" },
      { home: s4, away: s5, roundLabel: "quarterfinal" },
    ];
  }

  if (week === 16) {
    const w36 = winner(weeklyScores, 15, s3, s6);
    const w45 = winner(weeklyScores, 15, s4, s5);
    if (w36 == null || w45 == null) return [];
    const seedIndex = (id: number) => seeds.indexOf(id);
    const [lowerSeeded, higherSeeded] = seedIndex(w36) > seedIndex(w45) ? [w36, w45] : [w45, w36];
    return [
      { home: s1, away: lowerSeeded, roundLabel: "semifinal" },
      { home: s2, away: higherSeeded, roundLabel: "semifinal" },
    ];
  }

  if (week === 17) {
    const semis = getPlayoffMatchupsForWeek(seeds, weeklyScores, 16);
    if (semis.length < 2) return [];
    const w1 = winner(weeklyScores, 16, semis[0].home, semis[0].away);
    const w2 = winner(weeklyScores, 16, semis[1].home, semis[1].away);
    if (w1 == null || w2 == null) return [];
    return [{ home: w1, away: w2, roundLabel: "championship" }];
  }

  return [];
}

export function isPlayoffWeek(week: number): boolean {
  return (PLAYOFF_WEEKS as readonly number[]).includes(week);
}
