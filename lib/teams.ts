import type { Team } from "./types";

// Standard-Aufstellung. Die Slot-Reihenfolge (id 0..9 = Pick 1..10) kann auf der
// /setup-Seite frei umsortiert werden, z.B. um die reale Draft-Lotterie abzubilden.
export const DEFAULT_TEAMS: Team[] = [
  { id: 0, name: "Team Excelsior", manager: "Sebastian", color: "#F59E0B", isHuman: true, personality: "human" },
  { id: 1, name: "The Analytics Dept.", manager: "Logan Pierce", color: "#3B82F6", isHuman: false, personality: "analytics" },
  { id: 2, name: "Touchdown Cowboys", manager: "Buck Henderson", color: "#EF4444", isHuman: false, personality: "cowboys" },
  { id: 3, name: "Purple Dynasty", manager: "Victoria Styles", color: "#8B5CF6", isHuman: false, personality: "purple_dynasty" },
  { id: 4, name: "Fantasy Chaos", manager: "Derek Mullins", color: "#F59E0B", isHuman: false, personality: "chaos" },
  { id: 5, name: "Iron Curtain FC", manager: "Mikhail Petrov", color: "#6B7280", isHuman: false, personality: "iron_curtain" },
  { id: 6, name: "Sleeper Picks Only", manager: "Priya Nair", color: "#10B981", isHuman: false, personality: "sleeper" },
  { id: 7, name: "Old School Gridiron", manager: "Frank Callahan", color: "#D97706", isHuman: false, personality: "old_school" },
  { id: 8, name: "Zero RB Zero Problems", manager: "Alex Chen", color: "#06B6D4", isHuman: false, personality: "zero_rb" },
  { id: 9, name: "The Dynasty Builder", manager: "Sam Torres", color: "#EC4899", isHuman: false, personality: "dynasty_builder" },
];

export const PERSONALITY_QUOTES: Record<string, { de: string; en: string }> = {
  analytics: { de: "Nach meinen Projektionen ist das der Value Pick. Kein Reach.", en: "According to my projections, this is the value pick. No reach." },
  cowboys: { de: "Ich brauche diesen Burschen. Sofort.", en: "I need this guy. Right now." },
  purple_dynasty: { de: "Ich denke an Woche 16. Wer gewinnt dann mein Matchup?", en: "I'm thinking about Week 16. Who wins my matchup then?" },
  chaos: { de: "Ich hab gelesen er könnte explodieren. Ich nehm ihn.", en: "I read he could go off. I'm taking him." },
  iron_curtain: { de: "Meine Defense schlägt deine Offense. Immer.", en: "My defense beats your offense. Always." },
  sleeper: { de: "Alle schlafen auf ihm. Bald wollt ihr ihn alle.", en: "Everyone's sleeping on him. Soon you'll all want him." },
  old_school: { de: "Ohne Laufangriff gewinnst du nix. Das war immer so.", en: "Without a run game you win nothing. Always been that way." },
  zero_rb: { de: "RBs früh sind dead money. WR ist King.", en: "Early RBs are dead money. WR is king." },
  dynasty_builder: { de: "Er ist jung. In drei Jahren ist er der Beste an seiner Position.", en: "He's young. In three years he's the best at his position." },
};
