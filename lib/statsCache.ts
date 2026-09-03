import { supabase, supabaseConfigured } from "./supabase/client";
import { fetchWeekStats, type WeekStatsResult } from "./nflStats";

/**
 * Liefert die NFL-Stats einer Woche — aus dem geteilten Cache, falls die
 * Woche dort bereits VOLLSTÄNDIG abgeschlossen hinterlegt ist (dann ändert
 * sich nichts mehr daran, für immer sicher wiederverwendbar). Andernfalls
 * (Cache leer, oder Spiele noch nicht fertig — z.B. laufender Sonntag) wird
 * frisch von ESPN gezogen und der Cache aktualisiert, damit andere Ligen
 * direkt davon profitieren.
 */
export async function getOrFetchWeekStats(seasonYear: number, week: number, seasonType: 1 | 2 = 2): Promise<WeekStatsResult> {
  if (supabaseConfigured && supabase) {
    const { data } = await supabase
      .from("nfl_stats_cache")
      .select("stats")
      .eq("season_year", seasonYear)
      .eq("week", week)
      .eq("season_type", seasonType)
      .maybeSingle();

    if (data?.stats) {
      const cached = data.stats as WeekStatsResult;
      const fullyDone = cached.games.length > 0 && cached.games.every((g) => g.completed);
      if (fullyDone) return cached;
    }
  }

  const fresh = await fetchWeekStats(seasonYear, week, seasonType);

  if (supabaseConfigured && supabase) {
    await supabase.from("nfl_stats_cache").upsert({
      season_year: seasonYear,
      week,
      season_type: seasonType,
      stats: fresh,
    });
  }

  return fresh;
}
