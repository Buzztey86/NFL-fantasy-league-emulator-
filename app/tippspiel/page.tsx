"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { fetchScoreboard, type GameResult } from "@/lib/nflStats";
import { computeWeekScore, scoreGamePrediction, type ScorePrediction } from "@/lib/tippspiel";
import { useToast } from "@/components/ToastProvider";
import { CountUp } from "@/components/CountUp";
import { motion } from "motion/react";
import { useLang } from "@/lib/i18n/LanguageContext";

const SEASON_YEAR = 2026;
const TOTAL_WEEKS = 18;

interface PickRow {
  game_id: string;
  picked_home_score: number;
  picked_away_score: number;
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
  const [myPicks, setMyPicks] = useState<Record<string, ScorePrediction>>({});
  const [draft, setDraft] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState(false);

  const [leaderboard, setLeaderboard] = useState<{ userId: string; name: string; points: number }[] | null>(null);
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
        .select("game_id, picked_home_score, picked_away_score")
        .eq("user_id", userId)
        .eq("season_year", SEASON_YEAR)
        .eq("week", week);
      const picks: Record<string, ScorePrediction> = {};
      const draftInit: Record<string, { home: string; away: string }> = {};
      for (const row of (data ?? []) as PickRow[]) {
        picks[row.game_id] = { home: row.picked_home_score, away: row.picked_away_score };
        draftInit[row.game_id] = { home: String(row.picked_home_score), away: String(row.picked_away_score) };
      }
      setMyPicks(picks);
      setDraft(draftInit);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    }
    setGamesLoading(false);
  }

  function setDraftValue(gameId: string, side: "home" | "away", value: string) {
    setDraft((prev) => ({ ...prev, [gameId]: { ...(prev[gameId] ?? { home: "", away: "" }), [side]: value } }));
  }

  async function saveAllPicks() {
    if (!supabase || !userId || !games) return;
    setSaving(true);
    const rows = [];
    const newPicks: Record<string, ScorePrediction> = { ...myPicks };
    for (const g of games) {
      if (g.completed) continue;
      const d = draft[g.id];
      if (!d || d.home === "" || d.away === "") continue;
      const home = Number(d.home);
      const away = Number(d.away);
      if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) continue;
      rows.push({ user_id: userId, season_year: SEASON_YEAR, week, game_id: g.id, picked_home_score: home, picked_away_score: away });
      newPicks[g.id] = { home, away };
    }
    if (rows.length > 0) {
      await supabase.from("tippspiel_picks").upsert(rows);
      setMyPicks(newPicks);
      showToast(tp.saved);
    }
    setSaving(false);
  }

  async function computeLeaderboardAll() {
    if (!supabase) return;
    setLeaderboardLoading(true);

    const { data: players } = await supabase.from("tippspiel_players").select("user_id, display_name");
    const { data: allPicks } = await supabase
      .from("tippspiel_picks")
      .select("user_id, week, game_id, picked_home_score, picked_away_score")
      .eq("season_year", SEASON_YEAR);

    const picksByUserWeek = new Map<string, Record<string, ScorePrediction>>();
    const weeksNeeded = new Set<number>();
    for (const row of allPicks ?? []) {
      const key = `${row.user_id}:${row.week}`;
      const entry = picksByUserWeek.get(key) ?? {};
      entry[row.game_id] = { home: row.picked_home_score, away: row.picked_away_score };
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
        const { points } = computeWeekScore(picks, weekGames);
        totals.set(player.user_id, (totals.get(player.user_id) ?? 0) + points);
      }
    }

    const sorted = (players ?? [])
      .map((p) => ({ userId: p.user_id, name: p.display_name, points: totals.get(p.user_id) ?? 0 }))
      .sort((a, b) => b.points - a.points);
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

      <header className="text-center mb-3">
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}>
          {tp.heading}
        </h1>
        <p className="text-xs text-[var(--text-dim)] mt-2">{tp.subtitle}</p>
      </header>
      <p className="text-center text-[11px] text-[var(--text-dim)] mb-5">{tp.scoringHint}</p>

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
              {myWeekScore && myWeekScore.gamesScored > 0 && (
                <p className="text-center mb-3">
                  <span className="text-2xl stat-number">
                    <CountUp value={myWeekScore.points} />
                  </span>
                  <span className="text-xs text-[var(--text-dim)] ml-1.5">
                    {tp.pointsShort} ({myWeekScore.gamesScored} {t.season.gamesEvaluated})
                  </span>
                </p>
              )}
              <div className="space-y-2 mb-4">
                {games.map((g) => {
                  const pred = myPicks[g.id];
                  const gamePoints = g.completed && pred ? scoreGamePrediction(pred, g.homeScore, g.awayScore) : null;
                  const d = draft[g.id] ?? { home: "", away: "" };
                  return (
                    <div key={g.id} className="card">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 flex items-center gap-2 justify-end">
                          <span className="text-xs font-semibold">{g.away}</span>
                          {g.completed ? (
                            <span className="tabular-nums text-sm font-bold w-8 text-center">{g.awayScore}</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              value={d.away}
                              onChange={(e) => setDraftValue(g.id, "away", e.target.value)}
                              className="w-12 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-1 py-1 text-sm text-center tabular-nums"
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-dim)]">@</span>
                        <div className="flex-1 flex items-center gap-2">
                          {g.completed ? (
                            <span className="tabular-nums text-sm font-bold w-8 text-center">{g.homeScore}</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              value={d.home}
                              onChange={(e) => setDraftValue(g.id, "home", e.target.value)}
                              className="w-12 bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-md px-1 py-1 text-sm text-center tabular-nums"
                            />
                          )}
                          <span className="text-xs font-semibold">{g.home}</span>
                        </div>
                      </div>
                      {pred && (
                        <div className="text-center text-[10px] text-[var(--text-dim)] mt-1.5">
                          {pred.away}-{pred.home} getippt
                          {gamePoints != null && (
                            <span className={gamePoints > 0 ? "text-[var(--green)] font-bold ml-1" : "text-[var(--text-dim)] ml-1"}>
                              · {gamePoints} {tp.pointsShort}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-center">
                <button
                  onClick={saveAllPicks}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-md text-sm font-semibold border border-[var(--gold-border)] bg-[var(--gold-bg)] text-[var(--gold)] disabled:opacity-40"
                >
                  {tp.saveAll}
                </button>
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
                    <motion.tr
                      key={row.userId}
                      className="border-b border-[var(--border-inner)]"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <td className="py-2 text-[var(--text-dim)]">{i + 1}</td>
                      <td className="font-semibold text-[var(--text-primary)]">
                        {row.name} {row.userId === userId && <span className="text-[var(--gold)] text-[10px]">{tp.you}</span>}
                      </td>
                      <td className="text-right tabular-nums text-[var(--gold)] font-bold">
                        <CountUp value={row.points} />
                      </td>
                    </motion.tr>
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
