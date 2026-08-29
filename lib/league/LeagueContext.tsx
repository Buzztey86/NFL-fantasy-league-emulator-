"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";

export interface Membership {
  leagueId: string;
  leagueName: string;
  teamId: number;
  isOwner: boolean;
}

interface LeagueContextValue {
  loading: boolean;
  loadError: string | null;
  userId: string | null;
  memberships: Membership[];
  activeLeagueId: string | null;
  activeMembership: Membership | null;
  setActiveLeagueId: (id: string) => void;
  refresh: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextValue | null>(null);

const ACTIVE_LEAGUE_KEY = "gridiron-oracle-active-league";

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeLeagueId, setActiveLeagueIdState] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    if (!supabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const { data: memberRows, error: memberError } = await supabase
      .from("league_members")
      .select("league_id, team_id")
      .eq("user_id", user.id);

    if (memberError) {
      // Echten Fehler NICHT als "brandneuer Nutzer" missinterpretieren —
      // sonst würde bei einem RLS-/Netzwerkfehler fälschlich eine zusätzliche
      // Liga angelegt, statt das eigentliche Problem sichtbar zu machen.
      setLoadError(memberError.message);
      setLoading(false);
      return;
    }

    let rows = memberRows ?? [];

    // Brandneuer Nutzer ohne jede Mitgliedschaft -> automatisch eigene erste Liga anlegen.
    if (rows.length === 0) {
      const { data: newLeague, error: createError } = await supabase
        .from("leagues")
        .insert({ owner_id: user.id })
        .select("id")
        .single();
      if (!createError && newLeague) {
        await supabase.from("league_members").insert({ league_id: newLeague.id, user_id: user.id, team_id: 0 });
        rows = [{ league_id: newLeague.id, team_id: 0 }];
      }
    }

    const leagueIds = rows.map((m) => m.league_id);
    const leagueNames = new Map<string, { name: string; ownerId: string }>();
    if (leagueIds.length > 0) {
      const { data: leagueRows } = await supabase.from("leagues").select("id, name, owner_id").in("id", leagueIds);
      for (const l of leagueRows ?? []) leagueNames.set(l.id, { name: l.name, ownerId: l.owner_id });
    }

    const list: Membership[] = rows.map((m) => ({
      leagueId: m.league_id,
      teamId: m.team_id,
      leagueName: leagueNames.get(m.league_id)?.name ?? "Liga",
      isOwner: leagueNames.get(m.league_id)?.ownerId === user.id,
    }));
    setMemberships(list);

    const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_LEAGUE_KEY) : null;
    const validStored = stored && list.some((m) => m.leagueId === stored) ? stored : null;
    setActiveLeagueIdState(validStored ?? list[0]?.leagueId ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setActiveLeagueId = (id: string) => {
    setActiveLeagueIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_LEAGUE_KEY, id);
  };

  const activeMembership = memberships.find((m) => m.leagueId === activeLeagueId) ?? null;

  return (
    <LeagueContext.Provider value={{ loading, loadError, userId, memberships, activeLeagueId, activeMembership, setActiveLeagueId, refresh: load }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeagueContext() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeagueContext muss innerhalb von <LeagueProvider> verwendet werden.");
  return ctx;
}
