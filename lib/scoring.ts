export interface PlayerStatLine {
  passYds: number;
  passTD: number;
  passInt: number;
  rushYds: number;
  rushTD: number;
  rec: number;
  recYds: number;
  recTD: number;
  fumLost: number;
  twoPtConv: number; // best effort, oft 0 da schwer aus der Quelle extrahierbar
}

export function emptyStatLine(): PlayerStatLine {
  return { passYds: 0, passTD: 0, passInt: 0, rushYds: 0, rushTD: 0, rec: 0, recYds: 0, recTD: 0, fumLost: 0, twoPtConv: 0 };
}

/** Offense-Scoring (QB/RB/WR/TE) — deckt FLEX automatisch mit ab. */
export function scoreOffensePlayer(s: PlayerStatLine): number {
  let pts = 0;
  pts += s.passTD * 4;
  pts += (s.passYds / 25) * 1;
  pts += s.passInt * -2;
  pts += s.rushTD * 6;
  pts += (s.rushYds / 10) * 1;
  pts += s.rec * 1; // Full PPR
  pts += s.recTD * 6;
  pts += (s.recYds / 10) * 1;
  pts += s.fumLost * -2;
  pts += s.twoPtConv * 2;
  return Math.round(pts * 100) / 100;
}

export interface KickerStatLine {
  fgMade: { distance: number }[]; // exakte Distanz pro getroffenem FG
  fgMissed: number;
  xpMade: number;
}

export function scoreKicker(s: KickerStatLine): number {
  let pts = 0;
  for (const fg of s.fgMade) {
    if (fg.distance >= 50) pts += 5;
    else if (fg.distance >= 40) pts += 4;
    else pts += 3;
  }
  pts += s.fgMissed * -1;
  pts += s.xpMade * 1;
  return Math.round(pts * 100) / 100;
}

export interface DefenseStatLine {
  sacks: number;
  int: number;
  fumRec: number;
  defTD: number; // eigene Defense-/Special-Teams-TDs
  safety: number;
  pointsAllowed: number;
}

export function scoreDefense(s: DefenseStatLine): number {
  let pts = 0;
  pts += s.sacks * 1;
  pts += s.int * 2;
  pts += s.fumRec * 2;
  pts += s.defTD * 6;
  pts += s.safety * 2;

  const pa = s.pointsAllowed;
  if (pa === 0) pts += 10;
  else if (pa <= 6) pts += 7;
  else if (pa <= 13) pts += 4;
  else if (pa <= 20) pts += 1;
  else if (pa <= 27) pts += 0;
  else if (pa <= 34) pts += -1;
  else pts += -4;

  return Math.round(pts * 100) / 100;
}
