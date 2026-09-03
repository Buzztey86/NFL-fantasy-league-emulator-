"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";

const ADMIN_EMAIL = "bastey86@googlemail.com";

interface AdminUser {
  user_id: string;
  email: string;
  created_at: string;
}
interface LeagueRow {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
}
interface MemberRow {
  league_id: string;
  user_id: string;
  team_id: number;
}
interface TippspielPlayerRow {
  user_id: string;
  display_name: string;
  created_at: string;
}

export default function AdminPage() {
  const { showToast } = useToast();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [tippspielPlayers, setTippspielPlayers] = useState<TippspielPlayerRow[]>([]);
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function checkAuth() {
      if (!supabaseConfigured || !supabase) {
        setChecking(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthorized(user?.email === ADMIN_EMAIL);
      setChecking(false);
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (!authorized || !supabase) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  async function loadAll() {
    if (!supabase) return;
    setLoading(true);
    const [usersRes, leaguesRes, membersRes, playersRes, picksRes] = await Promise.all([
      supabase.rpc("admin_list_users"),
      supabase.from("leagues").select("id, name, owner_id, invite_code, created_at").order("created_at", { ascending: false }),
      supabase.from("league_members").select("league_id, user_id, team_id"),
      supabase.from("tippspiel_players").select("user_id, display_name, created_at").order("created_at", { ascending: false }),
      supabase.from("tippspiel_picks").select("user_id"),
    ]);
    setUsers(usersRes.data ?? []);
    setLeagues(leaguesRes.data ?? []);
    setMembers(membersRes.data ?? []);
    setTippspielPlayers(playersRes.data ?? []);
    const counts: Record<string, number> = {};
    for (const row of picksRes.data ?? []) counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
    setPickCounts(counts);
    setLoading(false);
  }

  function emailOf(userId: string): string {
    return users.find((u) => u.user_id === userId)?.email ?? userId.slice(0, 8) + "…";
  }

  async function deleteLeague(league: LeagueRow) {
    if (!supabase) return;
    if (!confirm(`Liga "${league.name}" wirklich komplett löschen? Das entfernt auch alle Mitgliedschaften, den Draft und die Season-Daten. Nicht rückgängig zu machen.`)) return;
    await supabase.from("leagues").delete().eq("id", league.id);
    await supabase.from("league_state").delete().eq("id", league.id);
    await supabase.from("season_state").delete().eq("id", league.id);
    showToast("Liga gelöscht.");
    loadAll();
  }

  async function removeTippspielPlayer(player: TippspielPlayerRow) {
    if (!supabase) return;
    if (!confirm(`"${player.display_name}" wirklich aus dem Tippspiel entfernen? Löscht auch alle abgegebenen Tipps.`)) return;
    await supabase.from("tippspiel_players").delete().eq("user_id", player.user_id);
    showToast("Entfernt.");
    loadAll();
  }

  if (checking) return <main className="p-8 text-[var(--text-muted)]">Lade…</main>;
  if (!authorized) return <main className="p-8 text-center text-[var(--red)] text-sm">Kein Zugriff.</main>;

  return (
    <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-xs text-[var(--text-dim)]">
          ← Liga
        </Link>
      </div>

      <header className="text-center mb-6">
        <h1 className="hero-gradient-text font-black" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,32px)" }}>
          ADMIN
        </h1>
      </header>

      {loading ? (
        <p className="text-center text-sm text-[var(--text-dim)]">Lade Daten…</p>
      ) : (
        <div className="space-y-8">
          <section className="grid grid-cols-3 gap-3">
            <div className="card text-center">
              <div className="text-2xl font-black text-[var(--gold)] tabular-nums">{users.length}</div>
              <div className="text-[10px] text-[var(--text-dim)] mt-1">ACCOUNTS</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-black text-[var(--gold)] tabular-nums">{leagues.length}</div>
              <div className="text-[10px] text-[var(--text-dim)] mt-1">LIGEN</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-black text-[var(--gold)] tabular-nums">{tippspielPlayers.length}</div>
              <div className="text-[10px] text-[var(--text-dim)] mt-1">TIPPSPIEL-SPIELER</div>
            </div>
          </section>

          <section>
            <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">LIGEN</h2>
            <div className="card">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--text-dim)] border-b border-[var(--border-subtle)]">
                    <th className="py-2">Name</th>
                    <th>Owner</th>
                    <th className="text-center">Mitglieder</th>
                    <th>Erstellt</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {leagues.map((league) => {
                    const memberCount = members.filter((m) => m.league_id === league.id).length;
                    return (
                      <tr key={league.id} className="border-b border-[var(--border-inner)]">
                        <td className="py-2">{league.name}</td>
                        <td className="text-[var(--text-dim)]">{emailOf(league.owner_id)}</td>
                        <td className="text-center tabular-nums">{memberCount}</td>
                        <td className="text-[var(--text-dim)]">{new Date(league.created_at).toLocaleDateString("de-DE")}</td>
                        <td className="text-right">
                          <button onClick={() => deleteLeague(league)} className="text-[var(--red)] underline">
                            Löschen
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">TIPPSPIEL-TEILNEHMER</h2>
            <div className="card">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--text-dim)] border-b border-[var(--border-subtle)]">
                    <th className="py-2">Name</th>
                    <th>E-Mail</th>
                    <th className="text-center">Tipps abgegeben</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tippspielPlayers.map((player) => (
                    <tr key={player.user_id} className="border-b border-[var(--border-inner)]">
                      <td className="py-2 font-semibold">{player.display_name}</td>
                      <td className="text-[var(--text-dim)]">{emailOf(player.user_id)}</td>
                      <td className="text-center tabular-nums">{pickCounts[player.user_id] ?? 0}</td>
                      <td className="text-right">
                        <button onClick={() => removeTippspielPlayer(player)} className="text-[var(--red)] underline">
                          Entfernen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-[var(--gold)] text-xs font-bold tracking-wide mb-2">ALLE ACCOUNTS</h2>
            <div className="card">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--text-dim)] border-b border-[var(--border-subtle)]">
                    <th className="py-2">E-Mail</th>
                    <th>Registriert</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} className="border-b border-[var(--border-inner)]">
                      <td className="py-2">{u.email}</td>
                      <td className="text-[var(--text-dim)]">{new Date(u.created_at).toLocaleDateString("de-DE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
