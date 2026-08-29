import type { PersonalityId, Team } from "./types";
import { DEFAULT_TEAMS } from "./teams";

export type Persona = Omit<Team, "id">;

// Persona-Identität losgelöst vom Draft-Slot — wird auf der /setup-Seite den
// 10 Slots frei zugeordnet.
export const PERSONAS: Persona[] = DEFAULT_TEAMS.map(({ name, manager, color, isHuman, personality }) => ({
  name,
  manager,
  color,
  isHuman,
  personality,
}));

export function personaByPersonality(id: PersonalityId): Persona {
  return PERSONAS.find((p) => p.personality === id) ?? PERSONAS[0];
}

export function buildTeamsFromOrder(order: PersonalityId[]): Team[] {
  return order.map((personality, idx) => ({ ...personaByPersonality(personality), id: idx }));
}
