"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "./supabaseClient";
import type { LeagueState } from "./types";
import { DEFAULT_TEAMS } from "./teams";

const LOCAL_KEY = "gridiron-oracle-state-v1";
const ROW_ID = "default";

function defaultState(): LeagueState {
  return { teams: DEFAULT_TEAMS, draftLog: [], updatedAt: new Date().toISOString() };
}

interface Row {
  id: string;
  teams: LeagueState["teams"];
  draft_log: LeagueState["draftLog"];
  updated_at: string;
}

function rowToState(row: Row): LeagueState {
  return { teams: row.teams, draftLog: row.draft_log, updatedAt: row.updated_at };
}

export function useLeagueState() {
  const [state, setState] = useState<LeagueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (supabaseConfigured && supabase) {
        try {
          const { data, error: fetchError } = await supabase
            .from("league_state")
            .select("*")
            .eq("id", ROW_ID)
            .maybeSingle();

          if (fetchError) throw fetchError;

          if (!cancelled) {
            if (data) {
              setState(rowToState(data as Row));
            } else {
              const init = defaultState();
              await supabase.from("league_state").insert({
                id: ROW_ID,
                teams: init.teams,
                draft_log: init.draftLog,
                updated_at: init.updatedAt,
              });
              setState(init);
            }
            setLoading(false);
          }

          const channel = supabase
            .channel("league_state_changes")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "league_state", filter: `id=eq.${ROW_ID}` },
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
  }, []);

  const save = useCallback(async (next: LeagueState) => {
    const withTimestamp: LeagueState = { ...next, updatedAt: new Date().toISOString() };
    setState(withTimestamp);
    if (supabaseConfigured && supabase) {
      const { error: saveError } = await supabase.from("league_state").upsert({
        id: ROW_ID,
        teams: withTimestamp.teams,
        draft_log: withTimestamp.draftLog,
        updated_at: withTimestamp.updatedAt,
      });
      if (saveError) setError(saveError.message);
    } else if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(withTimestamp));
    }
  }, []);

  const reset = useCallback(async () => {
    await save(defaultState());
  }, [save]);

  return { state, loading, error, save, reset, cloudSynced: supabaseConfigured };
}
