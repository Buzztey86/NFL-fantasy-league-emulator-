import { emptyStatLine, type DefenseStatLine, type KickerStatLine, type PlayerStatLine } from "./scoring";
import { normalizePlayerName } from "./players";

// ── Datenquelle ───────────────────────────────────────────────────────────────
// site.api.espn.com ist eine inoffizielle, aber seit Jahren stabile und
// kostenlose ESPN-API ohne Key-Pflicht. Wird von vielen Fantasy-Hobbyprojekten
// genutzt. Risiko: nicht offiziell dokumentiert/unterstützt, könnte sich
// theoretisch ändern. Für ein privates Solo-Projekt ist das ein guter Deal
// (0 € statt kostenpflichtiger Anbieter wie SportsDataIO).
const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

export interface GameResult {
  id: string;
  home: string; // Team-Abkürzung
  away: string;
  homeScore: number;
  awayScore: number;
  completed: boolean;
}

export interface WeekStatsResult {
  week: number;
  season: number;
  games: GameResult[];
  players: Record<string, PlayerStatLine>; // Key: normalisierter Spielername
  kickers: Record<string, KickerStatLine>;
  defenses: Record<string, DefenseStatLine>; // Key: Team-Abkürzung
  fetchedAt: string;
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN-Anfrage fehlgeschlagen (${res.status}): ${url}`);
  return res.json();
}

function statVal(teamBlock: any, name: string): number {
  const s = teamBlock.statistics?.find((x: any) => x.name === name);
  if (!s) return 0;
  const n = Number(s.displayValue);
  return Number.isNaN(n) ? 0 : n;
}

function sacksFrom(teamBlock: any): number {
  const s = teamBlock.statistics?.find((x: any) => x.name === "sacksYardsLost");
  if (!s) return 0;
  const [sacks] = String(s.displayValue ?? "0-0").split("-").map(Number);
  return sacks || 0;
}

function parsePlayerCategories(
  boxPlayers: any[],
  players: Record<string, PlayerStatLine>,
  kickers: Record<string, KickerStatLine>
) {
  for (const teamBlock of boxPlayers) {
    const teamAbbr = teamBlock.team?.abbreviation ?? "";
    for (const cat of teamBlock.statistics ?? []) {
      const labels: string[] = cat.labels ?? [];
      const get = (a: any, label: string) => {
        const i = labels.indexOf(label);
        return i === -1 ? undefined : a.stats[i];
      };

      if (cat.name === "passing") {
        for (const a of cat.athletes ?? []) {
          const key = normalizePlayerName(a.athlete.displayName);
          const line = players[key] ?? emptyStatLine(a.athlete.displayName, teamAbbr);
          line.passYds += Number(get(a, "YDS")) || 0;
          line.passTD += Number(get(a, "TD")) || 0;
          line.passInt += Number(get(a, "INT")) || 0;
          players[key] = line;
        }
      } else if (cat.name === "rushing") {
        for (const a of cat.athletes ?? []) {
          const key = normalizePlayerName(a.athlete.displayName);
          const line = players[key] ?? emptyStatLine(a.athlete.displayName, teamAbbr);
          line.rushYds += Number(get(a, "YDS")) || 0;
          line.rushTD += Number(get(a, "TD")) || 0;
          players[key] = line;
        }
      } else if (cat.name === "receiving") {
        for (const a of cat.athletes ?? []) {
          const key = normalizePlayerName(a.athlete.displayName);
          const line = players[key] ?? emptyStatLine(a.athlete.displayName, teamAbbr);
          line.rec += Number(get(a, "REC")) || 0;
          line.recYds += Number(get(a, "YDS")) || 0;
          line.recTD += Number(get(a, "TD")) || 0;
          players[key] = line;
        }
      } else if (cat.name === "fumbles") {
        for (const a of cat.athletes ?? []) {
          const key = normalizePlayerName(a.athlete.displayName);
          const line = players[key] ?? emptyStatLine(a.athlete.displayName, teamAbbr);
          line.fumLost += Number(get(a, "LOST")) || 0;
          players[key] = line;
        }
      } else if (cat.name === "kicking") {
        for (const a of cat.athletes ?? []) {
          const key = normalizePlayerName(a.athlete.displayName);
          const k = kickers[key] ?? { fgMade: [], fgMissed: 0, xpMade: 0 };
          const xpStr = String(get(a, "XP") ?? "0/0");
          const [xpMade] = xpStr.split("/").map(Number);
          k.xpMade += xpMade || 0;
          kickers[key] = k;
        }
      }
    }
  }
}

/** Exakte FG-Distanzen kommen aus den Scoring-Play-Texten (z.B. "Jake Moody 45 Yd Field Goal"). */
function parseFieldGoalDistances(scoringPlays: any[], kickers: Record<string, KickerStatLine>) {
  for (const play of scoringPlays ?? []) {
    const m = String(play.text ?? "").match(/^(.+?)\s(\d+)\s?Yd Field Goal/i);
    if (m) {
      const key = normalizePlayerName(m[1]);
      const k = kickers[key] ?? { fgMade: [], fgMissed: 0, xpMade: 0 };
      k.fgMade.push({ distance: Number(m[2]) });
      kickers[key] = k;
    }
  }
}

/** Verpasste FGs stehen nicht in scoringPlays (keine Punkte) — via made/attempt-Differenz aus der Box-Score-Zeile. */
function parseMissedFieldGoals(boxPlayers: any[], kickers: Record<string, KickerStatLine>) {
  for (const teamBlock of boxPlayers) {
    const cat = teamBlock.statistics?.find((c: any) => c.name === "kicking");
    if (!cat) continue;
    const fgIdx = (cat.labels ?? []).indexOf("FG");
    for (const a of cat.athletes ?? []) {
      const key = normalizePlayerName(a.athlete.displayName);
      const [made, att] = String(a.stats[fgIdx] ?? "0/0").split("/").map(Number);
      const k = kickers[key] ?? { fgMade: [], fgMissed: 0, xpMade: 0 };
      const missed = Math.max(0, (att || 0) - (made || 0));
      k.fgMissed = missed;
      // Falls scoringPlays weniger Treffer lieferte als die Box Score (z.B. Parsing-Lücke),
      // mit einer neutralen Distanz-Schätzung auffüllen, statt Punkte zu unterschlagen.
      if (k.fgMade.length < (made || 0)) {
        for (let i = k.fgMade.length; i < made; i++) k.fgMade.push({ distance: 40 });
      }
      kickers[key] = k;
    }
  }
}

function parseTeamDefense(summary: any, defenses: Record<string, DefenseStatLine>) {
  const boxTeams = summary.boxscore?.teams ?? [];
  if (boxTeams.length !== 2) return;
  const [t0, t1] = boxTeams;
  const abbr0 = t0.team.abbreviation;
  const abbr1 = t1.team.abbreviation;

  const competitors = summary.header?.competitions?.[0]?.competitors ?? [];
  const scoreByAbbr: Record<string, number> = {};
  for (const c of competitors) scoreByAbbr[c.team.abbreviation] = Number(c.score) || 0;

  const def0: DefenseStatLine = defenses[abbr0] ?? { sacks: 0, int: 0, fumRec: 0, defTD: 0, safety: 0, pointsAllowed: 0 };
  def0.sacks += sacksFrom(t1);
  def0.int += statVal(t1, "interceptions");
  def0.fumRec += statVal(t1, "fumblesLost");
  def0.defTD += statVal(t0, "defensiveTouchdowns");
  def0.pointsAllowed += scoreByAbbr[abbr1] ?? 0;
  defenses[abbr0] = def0;

  const def1: DefenseStatLine = defenses[abbr1] ?? { sacks: 0, int: 0, fumRec: 0, defTD: 0, safety: 0, pointsAllowed: 0 };
  def1.sacks += sacksFrom(t0);
  def1.int += statVal(t0, "interceptions");
  def1.fumRec += statVal(t0, "fumblesLost");
  def1.defTD += statVal(t1, "defensiveTouchdowns");
  def1.pointsAllowed += scoreByAbbr[abbr0] ?? 0;
  defenses[abbr1] = def1;

  for (const play of summary.scoringPlays ?? []) {
    if (/safety/i.test(String(play.text ?? ""))) {
      const scoringAbbr = play.team?.abbreviation;
      if (scoringAbbr === abbr0) def0.safety += 1;
      else if (scoringAbbr === abbr1) def1.safety += 1;
    }
  }
}

export async function fetchWeekStats(season: number, week: number, seasonType: 1 | 2 = 2): Promise<WeekStatsResult> {
  const scoreboard = await fetchJson(`${BASE}/scoreboard?dates=${season}&seasontype=${seasonType}&week=${week}`);

  const games: GameResult[] = (scoreboard.events ?? []).map((e: any) => {
    const comp = e.competitions[0];
    const home = comp.competitors.find((c: any) => c.homeAway === "home");
    const away = comp.competitors.find((c: any) => c.homeAway === "away");
    return {
      id: e.id,
      home: home.team.abbreviation,
      away: away.team.abbreviation,
      homeScore: Number(home.score) || 0,
      awayScore: Number(away.score) || 0,
      completed: Boolean(e.status?.type?.completed),
    };
  });

  const players: Record<string, PlayerStatLine> = {};
  const kickers: Record<string, KickerStatLine> = {};
  const defenses: Record<string, DefenseStatLine> = {};

  const completedGames = games.filter((g) => g.completed);
  // Sequenziell statt Promise.all, um die inoffizielle API nicht mit Bursts zu belasten.
  for (const game of completedGames) {
    const summary = await fetchJson(`${BASE}/summary?event=${game.id}`);
    parsePlayerCategories(summary.boxscore?.players ?? [], players, kickers);
    parseFieldGoalDistances(summary.scoringPlays ?? [], kickers);
    parseMissedFieldGoals(summary.boxscore?.players ?? [], kickers);
    parseTeamDefense(summary, defenses);
  }

  return { week, season, games, players, kickers, defenses, fetchedAt: new Date().toISOString() };
}
