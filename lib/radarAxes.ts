import type { Position } from "./types";

export const RADAR_AXES: Record<Position, { de: string[]; en: string[] }> = {
  QB: { de: ["Arm", "Scramble", "Accuracy", "TD-Rate", "Floor", "Upside"], en: ["Arm", "Scramble", "Accuracy", "TD Rate", "Floor", "Upside"] },
  RB: { de: ["Workload", "Receiving", "TD-Rate", "SOS", "Handcuff", "Floor"], en: ["Workload", "Receiving", "TD Rate", "SOS", "Handcuff", "Floor"] },
  WR: { de: ["Targets", "YAC", "Separation", "Red Zone", "TD-Rate", "Floor"], en: ["Targets", "YAC", "Separation", "Red Zone", "TD Rate", "Floor"] },
  TE: { de: ["Targets", "Blocking", "Routes", "Red Zone", "TD-Rate", "Floor"], en: ["Targets", "Blocking", "Routes", "Red Zone", "TD Rate", "Floor"] },
  DST: { de: ["Sacks", "INT", "Punkte-Allow", "TD", "Turnover", "Schedule"], en: ["Sacks", "INT", "Points Allowed", "TD", "Turnovers", "Schedule"] },
  K: { de: ["Acc.", "Volumen", "FG 50+", "XP-Rate", "SOS", "Team-Off"], en: ["Acc.", "Volume", "FG 50+", "XP Rate", "SOS", "Team Off."] },
};

export const RADAR_AXIS_TIPS: Record<Position, { de: string[]; en: string[] }> = {
  QB: {
    de: ["Wurfstärke & Tiefenpässe", "Rushing-Punkte als QB", "Completion Rate & Präzision", "TDs je Wurfversuch", "Mindestertrag pro Woche", "Maximales Punktepotenzial"],
    en: ["Arm strength & deep passing", "Rushing points as a QB", "Completion rate & accuracy", "TDs per pass attempt", "Minimum output per week", "Maximum point potential"],
  },
  RB: {
    de: ["Carries + Targets gesamt", "Passfang-Fähigkeit im PPR", "Red-Zone-Einbindung & TDs", "Matchup-Qualität vs. Defenses", "Backup-Risiko bei Verletzung", "Garantierter Mindestwert"],
    en: ["Total carries + targets", "Pass-catching ability in PPR", "Red zone usage & TDs", "Matchup quality vs. defenses", "Backup risk if injured", "Guaranteed minimum value"],
  },
  WR: {
    de: ["Anzahl gezielter Pässe", "Yards nach dem Fang", "Freikommen von Coverage", "Einbindung in Red Zone", "TDs je Catch", "Konsistenz ohne Touchdown"],
    en: ["Number of targets", "Yards after catch", "Ability to separate from coverage", "Red zone usage", "TDs per catch", "Consistency without a touchdown"],
  },
  TE: {
    de: ["Anzahl gezielter Pässe", "Blocking-Last (niedrig = gut)", "Route-Running-Qualität", "Nutzung in Red Zone", "TDs je Saison", "Mindestertrag ohne TD"],
    en: ["Number of targets", "Blocking load (lower = better)", "Route-running quality", "Red zone usage", "TDs per season", "Minimum output without a TD"],
  },
  DST: {
    de: ["QB-Sacks pro Spiel", "Interceptions & Picks", "Zugelassene Punkte (weniger = besser)", "Defensive Touchdowns", "Fumbles + Picks zusammen", "Schwierigkeit des Restplans"],
    en: ["QB sacks per game", "Interceptions", "Points allowed (fewer = better)", "Defensive touchdowns", "Fumbles + picks combined", "Difficulty of remaining schedule"],
  },
  K: {
    de: ["FG-Trefferquote gesamt", "Anzahl FG-Versuche", "Long-FG über 50 Yards", "Extra-Point-Quote", "Gegner-Defense-Stärke", "Offense-Qualität des Teams"],
    en: ["Overall FG accuracy", "Number of FG attempts", "Long FGs over 50 yards", "Extra point rate", "Opposing defense strength", "Quality of own team offense"],
  },
};
