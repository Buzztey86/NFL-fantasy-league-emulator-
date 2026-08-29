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

const ACCEPT_QUOTES: Record<PersonalityId, { de: string; en: string }> = {
  human: { de: "", en: "" },
  analytics: { de: "Die Zahlen sprechen dafür. Ich nehme an.", en: "The numbers support it. I accept." },
  cowboys: { de: "Deal! Ich brauchte genau diesen Move.", en: "Deal! I needed exactly this move." },
  purple_dynasty: { de: "Das passt zu meinem Plan für die Playoffs. Abgemacht.", en: "This fits my playoff plan. Agreed." },
  chaos: { de: "Mein Bauchgefühl sagt ja. Machen wir's!", en: "My gut says yes. Let's do it!" },
  iron_curtain: { de: "Endlich jemand, der Defense und QB richtig einschätzt. Deal.", en: "Finally someone who values defense and QB right. Deal." },
  sleeper: { de: "Ich sehe hier Wert, den andere übersehen. Ich bin dabei.", en: "I see value here others are missing. I'm in." },
  old_school: { de: "Ein guter Läufer ist ein guter Läufer. Ich nehme an.", en: "A good runner is a good runner. I accept." },
  zero_rb: { de: "WR-Tiefe für Sicherheit? Klingt nach mir. Deal.", en: "WR depth for security? Sounds like me. Deal." },
  dynasty_builder: { de: "Er ist jung genug für meinen Plan. Ich nehme an.", en: "He's young enough for my plan. I accept." },
};

const REJECT_QUOTES: Record<PersonalityId, { de: string; en: string }> = {
  human: { de: "", en: "" },
  analytics: {
    de: "Nach meinen Projektionen hätte dieser Trade für mich einen negativen Expected-Value. Ich lehne ab.",
    en: "According to my projections, this trade has a negative expected value for me. I decline.",
  },
  cowboys: { de: "Nicht genug Star-Power für mich dabei. Kein Deal.", en: "Not enough star power in this for me. No deal." },
  purple_dynasty: { de: "Ich denke an Woche 16. Das hilft mir da nicht genug.", en: "I'm thinking about Week 16. This doesn't help me enough there." },
  chaos: { de: "Fühlt sich nicht richtig an. Vielleicht ein andermal.", en: "Doesn't feel right. Maybe another time." },
  iron_curtain: { de: "Meine Defense schlägt deine Offense. Ich brauche diesen Trade nicht.", en: "My defense beats your offense. I don't need this trade." },
  sleeper: { de: "Ich glaube, ich finde noch besseren Value auf dem Waiver Wire. Nein danke.", en: "I think I'll find better value on the waiver wire. No thanks." },
  old_school: { de: "Du willst mir einen Läufer wegnehmen? Ohne Laufangriff gewinnst du nix.", en: "You want to take a runner from me? Without a run game you win nothing." },
  zero_rb: { de: "RBs früh abzugeben ist dead money für mich. Kein Interesse.", en: "Giving up early RBs is dead money for me. Not interested." },
  dynasty_builder: { de: "Zu alt für meinen Zeitplan. Ich baue lieber weiter.", en: "Too old for my timeline. I'd rather keep building." },
};

/** Bewertet einen Trade aus KI-Sicht: aiGets = was die KI erhält, aiLoses = was die KI abgibt. */
export function evaluateTradeForAI(team: Team, aiGets: Player[], aiLoses: Player[], lang: "de" | "en" = "de"): TradeEvaluation {
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
  const reason = accept ? ACCEPT_QUOTES[team.personality][lang] : REJECT_QUOTES[team.personality][lang];
  return { accept, reason, delta: Math.round(delta * 10) / 10 };
}
