"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "./supabase/client";
import type { LeagueState } from "./types";
import { STARTING_FAAB } from "./types";
import { DEFAULT_TEAMS } from "./teams";

const LOCAL_KEY = "gridiron-oracle-state-v1";

export interface LeagueMemberRow {
  teamId: number;
  userId: string;
}

function defaultState(): LeagueState {
  const faab: Record<number, number> = {};
  for (const t of DEFAULT_TEAMS) faab[t.id] = STARTING_FAAB;
  return { teams: DEFAULT_TEAMS, draftLog: [], transactions: [], faab, irSlots: {}, updatedAt: new Date().toISOString() };
}

interface Row {
  id: string;
  teams: LeagueState["teams"];
  draft_log: LeagueState["draftLog"];
  transactions: LeagueState["transactions"];
  faab: LeagueState["faab"];
  ir_slots: LeagueState["irSlots"];
  updated_at: string;
}

function rowToState(row: Row): LeagueState {
  return {
    teams: row.teams,
    draftLog: row.draft_log,
    transactions: row.transactions ?? [],
    faab: row.faab ?? {},
    irSlots: row.ir_slots ?? {},
    updatedAt: row.updated_at,
  };
}

/**
 * @param leagueId Die ID der aktiven Liga (siehe useLeagueContext). Im
 * Local-Only-Modus (kein Supabase konfiguriert) wird sie ignoriert.
 */
export function useLeagueState(leagueId: string | null) {
  const [state, setState] = useState<LeagueState | null>(null);
  const [members, setMembers] = useState<LeagueMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (supabaseConfigured && supabase) {
        if (!leagueId) return; // Warten, bis der LeagueContext eine aktive Liga kennt.
        setLoading(true);
        try {
          const { data, error: fetchError } = await supabase.from("league_state").select("*").eq("id", leagueId).maybeSingle();
          if (fetchError) throw fetchError;

          if (!cancelled) {
            if (data) {
              setState(rowToState(data as Row));
            } else {
              const init = defaultState();
              await supabase.from("league_state").insert({
                id: leagueId,
                teams: init.teams,
                draft_log: init.draftLog,
                transactions: init.transactions,
                faab: init.faab,
                ir_slots: init.irSlots,
                updated_at: init.updatedAt,
              });
              setState(init);
            }
          }

          const { data: memberRows } = await supabase.from("league_members").select("team_id, user_id").eq("league_id", leagueId);
          if (!cancelled) setMembers((memberRows ?? []).map((m) => ({ teamId: m.team_id, userId: m.user_id })));

          if (!cancelled) setLoading(false);

          const channel = supabase
            .channel(`league_state_changes_${leagueId}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "league_state", filter: `id=eq.${leagueId}` },
              (payload) => {
                const row = payload.new as Row;
                if (row) setState(rowToState(row));
              }
            )
            .subscribe();
          channelRef.current = channel;
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Supabase-Fehler beim Laden.");
            setState(defaultState());
            setLoading(false);
          }
        }
      } else {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_KEY) : null;
        setState(raw ? (JSON.parse(raw) as LeagueState) : defaultState());
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (channelRef.current && supabase) supabase.removeChannel(channelRef.current);
    };
  }, [leagueId]);

  const save = useCallback(
    async (next: LeagueState) => {
      const withTimestamp: LeagueState = { ...next, updatedAt: new Date().toISOString() };
      setState(withTimestamp);
      if (supabaseConfigured && supabase && leagueId) {
        const { error: saveError } = await supabase.from("league_state").upsert({
          id: leagueId,
          teams: withTimestamp.teams,
          draft_log: withTimestamp.draftLog,
          transactions: withTimestamp.transactions,
          faab: withTimestamp.faab,
          ir_slots: withTimestamp.irSlots,
          updated_at: withTimestamp.updatedAt,
        });
        if (saveError) setError(saveError.message);
      } else if (!supabaseConfigured && typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify(withTimestamp));
      }
    },
    [leagueId]
  );

  const reset = useCallback(async () => {
    await save(defaultState());
  }, [save]);

  return { state, members, loading, error, save, reset, cloudSynced: supabaseConfigured };
}
