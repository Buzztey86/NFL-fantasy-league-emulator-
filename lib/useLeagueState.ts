"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "./supabase/client";
import type { LeagueState } from "./types";
import { STARTING_FAAB } from "./types";
import { DEFAULT_TEAMS } from "./teams";

const LOCAL_KEY = "gridiron-oracle-state-v1";

function defaultState(): LeagueState {
  const faab: Record<number, number> = {};
  for (const t of DEFAULT_TEAMS) faab[t.id] = STARTING_FAAB;
  return { teams: DEFAULT_TEAMS, draftLog: [], transactions: [], faab, updatedAt: new Date().toISOString() };
}

interface Row {
  id: string;
  teams: LeagueState["teams"];
  draft_log: LeagueState["draftLog"];
  transactions: LeagueState["transactions"];
  faab: LeagueState["faab"];
  updated_at: string;
}

function rowToState(row: Row): LeagueState {
  return {
    teams: row.teams,
    draftLog: row.draft_log,
    transactions: row.transactions ?? [],
    faab: row.faab ?? {},
    updatedAt: row.updated_at,
  };
}

export function useLeagueState() {
  const [state, setState] = useState<LeagueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  // Die Row-ID ist im Cloud-Modus die echte, authentifizierte User-ID —
  // dadurch bekommt jeder Google-Account automatisch seine eigene, per RLS
  // abgesicherte Liga, ganz ohne zusätzliche Schema-Spalte.
  const rowIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (supabaseConfigured && supabase) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            if (!cancelled) {
              setError("Nicht angemeldet.");
              setLoading(false);
            }
            return;
          }
          rowIdRef.current = user.id;

          const { data, error: fetchError } = await supabase.from("league_state").select("*").eq("id", user.id).maybeSingle();

          if (fetchError) throw fetchError;

          if (!cancelled) {
            if (data) {
              setState(rowToState(data as Row));
            } else {
              const init = defaultState();
              await supabase.from("league_state").insert({
                id: user.id,
                teams: init.teams,
                draft_log: init.draftLog,
                transactions: init.transactions,
                faab: init.faab,
                updated_at: init.updatedAt,
              });
              setState(init);
            }
            setLoading(false);
          }

          const channel = supabase
            .channel(`league_state_changes_${user.id}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "league_state", filter: `id=eq.${user.id}` },
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
    if (supabaseConfigured && supabase && rowIdRef.current) {
      const { error: saveError } = await supabase.from("league_state").upsert({
        id: rowIdRef.current,
        teams: withTimestamp.teams,
        draft_log: withTimestamp.draftLog,
        transactions: withTimestamp.transactions,
        faab: withTimestamp.faab,
        updated_at: withTimestamp.updatedAt,
      });
      if (saveError) setError(saveError.message);
    } else if (!supabaseConfigured && typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(withTimestamp));
    }
  }, []);

  const reset = useCallback(async () => {
    await save(defaultState());
  }, [save]);

  return { state, loading, error, save, reset, cloudSynced: supabaseConfigured };
}
