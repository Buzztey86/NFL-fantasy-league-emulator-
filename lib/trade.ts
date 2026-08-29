import type { Player, PersonalityId, Team } from "./types";

export interface TradeOffer {
  id: string;
  week: number;
  createdAt: string;
  proposerTeamId: number;
  receiverTeamId: number;
  proposerGives: number[]; // Ranks, die der Vorschlagende abgibt
  proposerGets: number[]; // Ranks, die der Vorschlagende dafür erhält
  status: "pending" | "accepted" | "rejected";
  aiReason?: string;
}

export interface TradeEvaluation {
  accept: boolean;
  reason: string;
  delta: number; // positiver Wert = gut für die KI
}

function tagBonus(players: Player[], tags: string[], amount: number): number {
  return players.reduce((sum, p) => sum + (p.tags.some((t) => tags.includes(t)) ? amount : 0), 0);
}

const ACCEPT_QUOTES: Record<PersonalityId, string> = {
  human: "",
  analytics: "Die Zahlen sprechen dafür. Ich nehme an.",
  cowboys: "Deal! Ich brauchte genau diesen Move.",
  purple_dynasty: "Das passt zu meinem Plan für die Playoffs. Abgemacht.",
  chaos: "Mein Bauchgefühl sagt ja. Machen wir's!",
  iron_curtain: "Endlich jemand, der Defense und QB richtig einschätzt. Deal.",
  sleeper: "Ich sehe hier Wert, den andere übersehen. Ich bin dabei.",
  old_school: "Ein guter Läufer ist ein guter Läufer. Ich nehme an.",
  zero_rb: "WR-Tiefe für Sicherheit? Klingt nach mir. Deal.",
  dynasty_builder: "Er ist jung genug für meinen Plan. Ich nehme an.",
};

const REJECT_QUOTES: Record<PersonalityId, string> = {
  human: "",
  analytics: `Nach meinen Projektionen hätte dieser Trade für mich einen negativen Expected-Value. Ich lehne ab.`,
  cowboys: "Nicht genug Star-Power für mich dabei. Kein Deal.",
  purple_dynasty: "Ich denke an Woche 16. Das hilft mir da nicht genug.",
  chaos: "Fühlt sich nicht richtig an. Vielleicht ein andermal.",
  iron_curtain: "Meine Defense schlägt deine Offense. Ich brauche diesen Trade nicht.",
  sleeper: "Ich glaube, ich finde noch besseren Value auf dem Waiver Wire. Nein danke.",
  old_school: "Du willst mir einen Läufer wegnehmen? Ohne Laufangriff gewinnst du nix.",
  zero_rb: "RBs früh abzugeben ist dead money für mich. Kein Interesse.",
  dynasty_builder: "Zu alt für meinen Zeitplan. Ich baue lieber weiter.",
};

/** Bewertet einen Trade aus KI-Sicht: aiGets = was die KI erhält, aiLoses = was die KI abgibt. */
export function evaluateTradeForAI(team: Team, aiGets: Player[], aiLoses: Player[]): TradeEvaluation {
  const rawValueIn = aiGets.reduce((s, p) => s + p.proj, 0);
  const rawValueOut = aiLoses.reduce((s, p) => s + p.proj, 0);
  let delta = rawValueIn - rawValueOut;
  let acceptThreshold = 0;

  switch (team.personality) {
    case "analytics":
      // Reiner Zahlenmensch — keine Zusatz-Bias, aber auch keine Toleranz für Minus-Trades.
      break;
    case "cowboys":
      delta += tagBonus(aiGets, ["Tier 1", "Elite", "Upside"], 12);
      acceptThreshold = -15; // überbezahlt bewusst für Stars
      break;
    case "purple_dynasty":
      delta += tagBonus(aiGets, ["Safe", "Floor-Monster"], 6) - tagBonus(aiLoses, ["Safe", "Floor-Monster"], 6);
      break;
    case "chaos":
      delta += (Math.random() - 0.35) * 25; // unberechenbar, manchmal grundlos begeistert
      acceptThreshold = -10;
      break;
    case "iron_curtain":
      delta += aiGets.filter((p) => p.pos === "QB" || p.pos === "DST").length * 10;
      delta -= aiLoses.filter((p) => p.pos === "QB" || p.pos === "DST").length * 10;
      break;
    case "sleeper":
      delta += aiGets.reduce((s, p) => s + (p.adp - p.rank > 8 ? 8 : 0), 0);
      break;
    case "old_school":
      delta += aiGets.filter((p) => p.pos === "RB").length * 8 - aiLoses.filter((p) => p.pos === "RB").length * 10;
      break;
    case "zero_rb":
      delta += aiGets.filter((p) => p.pos === "WR").length * 6;
      delta -= aiLoses.filter((p) => p.pos === "RB").length * -3; // gibt RBs bereitwillig ab
      break;
    case "dynasty_builder": {
      const ageIn = aiGets.reduce((s, p) => s + Math.max(0, 27 - p.age), 0);
      const ageOut = aiLoses.reduce((s, p) => s + Math.max(0, 27 - p.age), 0);
      delta += (ageIn - ageOut) * 1.5;
      break;
    }
    default:
      break;
  }

  const accept = delta >= acceptThreshold;
  const reason = accept ? ACCEPT_QUOTES[team.personality] : REJECT_QUOTES[team.personality];
  return { accept, reason, delta: Math.round(delta * 10) / 10 };
}
