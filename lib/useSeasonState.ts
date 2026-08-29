"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "./supabaseClient";
import type { SeasonState } from "./types";
import { REGULAR_SEASON_WEEKS, NUM_TEAMS } from "./types";
import { generateSchedule } from "./schedule";

const LOCAL_KEY = "gridiron-oracle-season-v1";
const ROW_ID = "default";
const SEASON_YEAR = 2026;

function defaultSeasonState(): SeasonState {
  return {
    seasonYear: SEASON_YEAR,
    schedule: generateSchedule(Array.from({ length: NUM_TEAMS }, (_, i) => i), REGULAR_SEASON_WEEKS),
    lineups: {},
    weeklyScores: {},
    updatedAt: new Date().toISOString(),
  };
}

interface Row {
  id: string;
  season_year: number;
  schedule: SeasonState["schedule"];
  lineups: SeasonState["lineups"];
  weekly_scores: SeasonState["weeklyScores"];
  updated_at: string;
}

function rowToState(row: Row): SeasonState {
  return {
    seasonYear: row.season_year,
    schedule: row.schedule,
    lineups: row.lineups,
    weeklyScores: row.weekly_scores,
    updatedAt: row.updated_at,
  };
}

export function useSeasonState() {
  const [state, setState] = useState<SeasonState | null>(null);
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
            .from("season_state")
            .select("*")
            .eq("id", ROW_ID)
            .maybeSingle();
          if (fetchError) throw fetchError;

          if (!cancelled) {
            if (data) {
              setState(rowToState(data as Row));
            } else {
              const init = defaultSeasonState();
              await supabase.from("season_state").insert({
                id: ROW_ID,
                season_year: init.seasonYear,
                schedule: init.schedule,
                lineups: init.lineups,
                weekly_scores: init.weeklyScores,
                updated_at: init.updatedAt,
              });
              setState(init);
            }
            setLoading(false);
          }

          const channel = supabase
            .channel("season_state_changes")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "season_state", filter: `id=eq.${ROW_ID}` },
              (payload) => {
                const row = payload.new as Row;
                if (row) setState(rowToState(row));
              }
            )
            .subscribe();
          channelRef.current = channel;
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Supabase-Fehler beim Laden des Season-State.");
            setState(defaultSeasonState());
            setLoading(false);
          }
        }
      } else {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_KEY) : null;
        setState(raw ? (JSON.parse(raw) as SeasonState) : defaultSeasonState());
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (channelRef.current && supabase) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const save = useCallback(async (next: SeasonState) => {
    const withTimestamp: SeasonState = { ...next, updatedAt: new Date().toISOString() };
    setState(withTimestamp);
    if (supabaseConfigured && supabase) {
      const { error: saveError } = await supabase.from("season_state").upsert({
        id: ROW_ID,
        season_year: withTimestamp.seasonYear,
        schedule: withTimestamp.schedule,
        lineups: withTimestamp.lineups,
        weekly_scores: withTimestamp.weeklyScores,
        updated_at: withTimestamp.updatedAt,
      });
      if (saveError) setError(saveError.message);
    } else if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(withTimestamp));
    }
  }, []);

  return { state, loading, error, save, cloudSynced: supabaseConfigured };
}
