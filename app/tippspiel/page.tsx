"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { fetchScoreboard, type GameResult } from "@/lib/nflStats";
import { computeWeekScore } from "@/lib/tippspiel";
import { useToast } from "@/components/ToastProvider";
import { useLang } from "@/lib/i18n/LanguageContext";

const SEASON_YEAR = 2026;
const TOTAL_WEEKS = 18;

interface PickRow {
  game_id: string;
  picked_team: string;
}

export default function TippspielPage() {
  const { t } = useLang();
  const tp = t.tippspiel;
  const c = t.common;
  const { showToast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [initializing, setInitializing] = useState(true);

  const [tab, setTab] = useState<"picks" | "leaderboard">("picks");
  const [week, setWeek] = useState(1);
  const [games, setGames] = useState<GameResult[] | null>(null);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [myPicks, setMyPicks] = useState<Record<string, string>>({});

  const [leaderboard, setLeaderboard] = useState<{ userId: string; name: string; correct: number }[] | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    async function init() {
      if (!supabaseConfigured || !supabase) {
        setInitializing(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setInitializing(false);
        return;
      }
      setUserId(user.id);
      const { data } = await supabase.from("tippspiel_players").select("display_name").eq("user_id", user.id).maybeSingle();
      setDisplayName(data?.display_name ?? null);
      setInitializing(false);
    }
    init();
  }, []);

  async function confirmName() {
    if (!supabase || !userId || !nameInput.trim()) return;
    await supabase.from("tippspiel_players").upsert({ user_id: userId, display_name: nameInput.trim() });
    setDisplayName(nameInput.trim());
  }

  async function loadGames() {
    if (!supabase || !userId) return;
    setGamesLoading(true);
    try {
      const result = await fetchScoreboard(SEASON_YEAR, week, 2);
      setGames(result);
      if (result.length === 0) showToast(tp.noGames, "info");

      const { data } = await supabase
        .from("tippspiel_picks")
        .select("game_id, picked_team")
        .eq("user_id", userId)
        .eq("season_year", SEASON_YEAR)
        .eq("week", week);
      const picks: Record<string, string> = {};
      for (const row of (data ?? []) as PickRow[]) picks[row.game_id] = row.picked_team;
      setMyPicks(picks);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    }
    setGamesLoading(false);
  }

  async function pick(gameId: string, teamAbbr: string) {
    if (!supabase || !userId) return;
    setMyPicks((prev) => ({ ...prev, [gameId]: teamAbbr }));
    await supabase.from("tippspiel_picks").upsert({
      user_id: userId,
      season_year: SEASON_YEAR,
      week,
      game_id: gameId,
      picked_team: teamAbbr,
    });
    showToast(tp.saved);
  }

  async function computeLeaderboardAll() {
    if (!supabase) return;
    setLeaderboardLoading(true);

    const { data: players } = await supabase.from("tippspiel_players").select("user_id, display_name");
    const { data: allPicks } = await supabase.from("tippspiel_picks").select("user_id, week, game_id, picked_team").eq("season_year", SEASON_YEAR);

    const picksByUserWeek = new Map<string, Record<string, string>>();
    const weeksNeeded = new Set<number>();
    for (const row of allPicks ?? []) {
      const key = `${row.user_id}:${row.week}`;
      const entry = picksByUserWeek.get(key) ?? {};
      entry[row.game_id] = row.picked_team;
      picksByUserWeek.set(key, entry);
      weeksNeeded.add(row.week);
    }

    const gamesByWeek = new Map<number, GameResult[]>();
    for (const w of Array.from(weeksNeeded).sort((a, b) => a - b)) {
      try {
        gamesByWeek.set(w, await fetchScoreboard(SEASON_YEAR, w, 2));
      } catch {
        // Woche überspringen, falls Abruf fehlschlägt — Rest trotzdem berechnen.
      }
    }

    const totals = new Map<string, number>();
    for (const player of players ?? []) totals.set(player.user_id, 0);
    for (const w of weeksNeeded) {
      const weekGames = gamesByWeek.get(w);
      if (!weekGames) continue;
      for (const player of players ?? []) {
        const picks = picksByUserWeek.get(`${player.user_id}:${w}`);
        const { correct } = computeWeekScore(picks, weekGames);
        totals.set(player.user_id, (totals.get(player.user_id) ?? 0) + correct);
      }
    }

    const sorted = (players ?? [])
      .map((p) => ({ userId: p.user_id, name: p.display_name, correct: totals.get(p.user_id) ?? 0 }))
      .sort((a, b) => b.correct - a.correct);
    setLeaderboard(sorted);
    setLeaderboardLoading(false);
  }

  if (!supabaseConfigured) {
    return <main className="p-8 text-center text-[var(--text-muted)]">{t.login.notConfigured}</main>;
  }
  if (initializing) {
    return <main className="p-8 text-[var(--text-muted)]">{c.loadingLeague}</main>;
  }

  if (!displayName) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-[360px] w-full text-center">
          <h1 className="hero-gradient-text font-black mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,30px)" }}>
            {tp.heading}
          </h1>
          <p className="text-sm text-[var(--text-dim)] mb-4">{tp.chooseName}</p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={tp.namePlaceholder}
            className="w-full mb-3 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-full px-4 py-3 text-sm text-[var(--text-primary)] text-center"
          />
          <button
            onClick={confirmName}
            disabled={!nameInput.trim()}
            className="w-full px-4 py-2.5 rounded-full text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
          >
            {tp.confirmName}
          </button>
        </div>
      </main>
    );
  }

  const myWeekScore = games ? computeWeekScore(myPicks, games) : null;

  return (
    <main className="mx-auto max-w-[700px] px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-dim)]">
          {c.backToLeague}
        </Link>
        <span className="text-xs text-[var(--gold)]">{displayName}</span>
      </div>

      <header className="text-center mb-6">
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}>
          {tp.heading}
        </h1>
        <p className="text-xs text-[var(--text-dim)] mt-2">{tp.subtitle}</p>
      </header>

      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={() => setTab("picks")}
          className="px-4 py-1.5 rounded-md text-xs font-semibold border"
          style={tab === "picks" ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
        >
          {tp.picksTab}
        </button>
        <button
          onClick={() => setTab("leaderboard")}
          className="px-4 py-1.5 rounded-md text-xs font-semibold border"
          style={tab === "leaderboard" ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" } : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }}
        >
          {tp.leaderboardTab}
        </button>
      </div>

      {tab === "picks" && (
        <>
          <div className="flex gap-1 flex-wrap justify-center mb-4">
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                onClick={() => {
                  setWeek(w);
                  setGames(null);
                }}
                className="w-9 h-9 rounded-md text-xs font-semibold border"
                style={
                  w === week
                    ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" }
                    : { borderColor: "var(--border-mid)", color: "var(--text-muted)" }
                }
              >
                {w}
              </button>
            ))}
          </div>

          {!games ? (
            <div className="text-center">
              <button
                onClick={loadGames}
                disabled={gamesLoading}
                className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
              >
                {gamesLoading ? tp.loading : `${tp.loadGames} — ${tp.week} ${week}`}
              </button>
            </div>
          ) : (
            <>
              {myWeekScore && myWeekScore.total > 0 && (
                <p className="text-center text-xs text-[var(--gold)] mb-3 tabular-nums">
                  {myWeekScore.correct}/{myWeekScore.total} {tp.correct}
                </p>
              )}
              <div className="space-y-2">
                {games.map((g) => {
                  const picked = myPicks[g.id];
                  const homeWon = g.completed && g.homeScore > g.awayScore;
                  const awayWon = g.completed && g.awayScore > g.homeScore;
                  return (
                    <div key={g.id} className="card flex items-center justify-between gap-2">
                      <button
                        onClick={() => !g.completed && pick(g.id, g.away)}
                        disabled={g.completed}
                        className="flex-1 px-2 py-2 rounded-md text-xs font-semibold border text-center disabled:opacity-70"
                        style={
                          picked === g.away
                            ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" }
                            : { borderColor: "var(--border-mid)", color: awayWon ? "var(--green)" : "var(--text-secondary)" }
                        }
                      >
                        {g.away}
                        {g.completed && <div className="tabular-nums text-[10px] mt-0.5">{g.awayScore}</div>}
                      </button>
                      <span className="text-[10px] text-[var(--text-dim)]">@</span>
                      <button
                        onClick={() => !g.completed && pick(g.id, g.home)}
                        disabled={g.completed}
                        className="flex-1 px-2 py-2 rounded-md text-xs font-semibold border text-center disabled:opacity-70"
                        style={
                          picked === g.home
                            ? { borderColor: "var(--gold)", background: "var(--gold-bg)", color: "var(--gold)" }
                            : { borderColor: "var(--border-mid)", color: homeWon ? "var(--green)" : "var(--text-secondary)" }
                        }
                      >
                        {g.home}
                        {g.completed && <div className="tabular-nums text-[10px] mt-0.5">{g.homeScore}</div>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {tab === "leaderboard" && (
        <>
          <div className="text-center mb-4">
            <button
              onClick={computeLeaderboardAll}
              disabled={leaderboardLoading}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
            >
              {leaderboardLoading ? tp.computing : tp.computeLeaderboard}
            </button>
          </div>
          {leaderboard && (
            <div className="card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-dim)] text-xs border-b border-[var(--border-subtle)]">
                    <th className="py-2">#</th>
                    <th>{tp.players}</th>
                    <th className="text-right">{tp.totalCorrect}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr key={row.userId} className="border-b border-[var(--border-inner)]">
                      <td className="py-2 text-[var(--text-dim)]">{i + 1}</td>
                      <td className="font-semibold text-[var(--text-primary)]">
                        {row.name} {row.userId === userId && <span className="text-[var(--gold)] text-[10px]">{tp.you}</span>}
                      </td>
                      <td className="text-right tabular-nums text-[var(--gold)] font-bold">{row.correct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
