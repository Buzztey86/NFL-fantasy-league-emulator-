-- The Gridiron Oracle League — Supabase Schema
-- Ausführen im Supabase Dashboard unter "SQL Editor" -> "New query" -> Run.

create table if not exists public.league_state (
  id text primary key default 'default',
  teams jsonb not null,
  draft_log jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security aktivieren...
alter table public.league_state enable row level security;

-- ...und jetzt ECHT einschränken: die Zeilen-ID ist die authentifizierte
-- Google-User-ID. Jeder Nutzer sieht und ändert ausschließlich seine eigene
-- Zeile. Falls du vorher die offene "allow all for anon"-Policy von Phase 1
-- hattest, wird sie hier ersetzt.
drop policy if exists "allow all for anon" on public.league_state;
drop policy if exists "users manage their own league_state" on public.league_state;
create policy "users manage their own league_state"
  on public.league_state
  for all
  using (auth.uid()::text = id)
  with check (auth.uid()::text = id);

-- Realtime aktivieren, damit Änderungen (z.B. dein Pick vom Handy) sofort
-- auf allen anderen offenen Geräten/Tabs erscheinen.
-- In ein DO-Block gewrappt, damit erneutes Ausführen dieses Skripts NICHT
-- mit "already member of publication" abbricht (das hätte sonst alles
-- Nachfolgende im Skript stillschweigend verhindert!).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'league_state'
  ) then
    alter publication supabase_realtime add table public.league_state;
  end if;
end $$;

-- ── Migration Phase 3: Waiver Wire & Trades ──────────────────────────────────
-- Sicher erneut ausführbar, auch wenn du schon eine bestehende league_state-
-- Zeile hast (add column if not exists ändert nichts an vorhandenen Daten).
alter table public.league_state add column if not exists transactions jsonb not null default '[]'::jsonb;
alter table public.league_state add column if not exists faab jsonb not null default '{}'::jsonb;
alter table public.league_state add column if not exists ir_slots jsonb not null default '{}'::jsonb;
-- Falls du das vorherige Skript (mit tippspiel_picks in league_state) schon
-- ausgeführt hattest: hier wieder sauber entfernen, da das Tippspiel jetzt
-- komplett unabhängig von der Fantasy-Liga läuft (siehe eigene Tabellen unten).
alter table public.league_state drop column if exists tippspiel_picks;

-- ── Season-State (Phase 2: Matchups, Scoring, Standings) ─────────────────────
create table if not exists public.season_state (
  id text primary key default 'default',
  season_year integer not null default 2026,
  schedule jsonb not null default '[]'::jsonb,
  lineups jsonb not null default '{}'::jsonb,
  weekly_scores jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.season_state enable row level security;

drop policy if exists "allow all for anon" on public.season_state;
drop policy if exists "users manage their own season_state" on public.season_state;
create policy "users manage their own season_state"
  on public.season_state
  for all
  using (auth.uid()::text = id)
  with check (auth.uid()::text = id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'season_state'
  ) then
    alter publication supabase_realtime add table public.season_state;
  end if;
end $$;

-- ── Migration Phase 5: Liga-Mitgliedschaften (Freunde per Link einladen) ─────
-- Bisher: league_state.id == die eigene User-ID (1 Account = 1 Liga).
-- Jetzt: league_state.id wird zur LIGA-ID. leagues + league_members regeln,
-- welcher Account welches Team in welcher Liga steuert. Für bereits
-- bestehende Nutzer wird unten automatisch eine Liga mit derselben ID wie
-- bisher angelegt, damit nichts verloren geht.

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null default 'The Gridiron Oracle League',
  invite_code text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_at timestamptz not null default now()
);
alter table public.leagues enable row level security;

create table if not exists public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null,
  team_id integer not null,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id),
  unique (league_id, team_id)
);
alter table public.league_members enable row level security;

-- Helper-Funktion statt einer selbstreferenzierenden Policy auf league_members
-- selbst (eine Policy auf Tabelle X, die in ihrem USING-Ausdruck wieder X
-- abfragt, ist ein bekannter Postgres-RLS-Fallstrick). security definer
-- umgeht das sauber, da die Funktion mit erhöhten Rechten liest.
drop function if exists public.is_league_member(uuid) cascade;
create function public.is_league_member(p_league_id uuid) returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.league_members where league_id = p_league_id and user_id = auth.uid()
  );
$$;
grant execute on function public.is_league_member(uuid) to authenticated;

drop policy if exists "members can view their leagues" on public.leagues;
create policy "members can view their leagues" on public.leagues for select using (
  public.is_league_member(id)
);
-- Die vorherige "anyone authenticated can look up a league by invite code"-Policy
-- ist entfernt: das war zu breit (jeder eingeloggte Nutzer konnte ALLE Ligen
-- sehen). Der Invite-Lookup läuft jetzt ausschließlich über die enge
-- security-definer-Funktion get_invite_preview() weiter unten.
drop policy if exists "anyone authenticated can look up a league by invite code" on public.leagues;
drop policy if exists "owners can update their league" on public.leagues;
create policy "owners can update their league" on public.leagues for update using (owner_id = auth.uid());
drop policy if exists "authenticated users can create a league" on public.leagues;
create policy "authenticated users can create a league" on public.leagues for insert with check (owner_id = auth.uid());

drop policy if exists "members can view league_members of their leagues" on public.league_members;
create policy "members can view league_members of their leagues" on public.league_members for select using (
  public.is_league_member(league_id)
);
-- Direktes Insert durch den Client ist nicht mehr nötig/erlaubt — das
-- Beitreten läuft jetzt ausschließlich über join_league() weiter unten,
-- damit Team-Verfügbarkeit serverseitig atomar geprüft wird.
drop policy if exists "users can join a league by inserting their own membership" on public.league_members;
drop policy if exists "owners can manage memberships" on public.league_members;
create policy "owners can manage memberships" on public.league_members for delete using (
  exists (select 1 from public.leagues l where l.id = league_members.league_id and l.owner_id = auth.uid())
);

-- league_state / season_state: von "gehört exakt einem User" auf
-- "gehört allen Mitgliedern dieser Liga" umstellen.
drop policy if exists "users manage their own league_state" on public.league_state;
drop policy if exists "members manage their league_state" on public.league_state;
create policy "members manage their league_state" on public.league_state for all using (
  public.is_league_member(id::uuid)
) with check (
  public.is_league_member(id::uuid)
);

drop policy if exists "users manage their own season_state" on public.season_state;
drop policy if exists "members manage their season_state" on public.season_state;
create policy "members manage their season_state" on public.season_state for all using (
  public.is_league_member(id::uuid)
) with check (
  public.is_league_member(id::uuid)
);

-- Migration bestehender Solo-Ligen: für jede vorhandene league_state-Zeile
-- eine Liga mit DERSELBEN ID anlegen (damit die Zeile weiter referenziert
-- werden kann) und den bisherigen Eigentümer als Mitglied seines "isHuman"-
-- Teams eintragen. Mehrfaches Ausführen ist sicher (on conflict do nothing).
-- Zeilen mit nicht-UUID-förmiger id (z.B. eine alte Test-Zeile "default" aus
-- der Zeit vor dem Login) werden dabei übersprungen statt das Skript
-- abbrechen zu lassen.
insert into public.leagues (id, owner_id)
select ls.id::uuid, ls.id::uuid
from public.league_state ls
where ls.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
on conflict (id) do nothing;

insert into public.league_members (league_id, user_id, team_id)
select
  ls.id::uuid,
  ls.id::uuid,
  coalesce(
    (select (t->>'id')::int from jsonb_array_elements(ls.teams) t where (t->>'isHuman')::boolean = true limit 1),
    0
  )
from public.league_state ls
where ls.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
on conflict (league_id, user_id) do nothing;

-- ── Security-Definer-Funktionen für den Invite-Flow ──────────────────────────
-- Grund: Ein Eingeladener ist per Definition noch KEIN Mitglied und darf laut
-- den obigen (bewusst engen) RLS-Policies weder leagues/league_members noch
-- league_state direkt lesen. Diese beiden Funktionen laufen mit den Rechten
-- des Funktions-Owners (security definer), geben aber nur genau die Felder
-- zurück, die die Invite-Seite braucht — keine Draft-Picks, kein FAAB, keine
-- User-IDs anderer Mitglieder, keine anderen Ligen.

drop function if exists public.get_invite_preview(text);
create function public.get_invite_preview(p_invite_code text)
returns table (league_id uuid, league_name text, teams jsonb, claimed_team_ids int[])
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    l.name,
    coalesce(
      (select jsonb_agg(jsonb_build_object('id', t->>'id', 'name', t->>'name', 'color', t->>'color'))
       from jsonb_array_elements(ls.teams) t),
      '[]'::jsonb
    ),
    coalesce((select array_agg(m.team_id) from public.league_members m where m.league_id = l.id), array[]::int[])
  from public.leagues l
  left join public.league_state ls on ls.id = l.id::text
  where l.invite_code = p_invite_code;
$$;
grant execute on function public.get_invite_preview(text) to authenticated;

drop function if exists public.join_league(text, int, text, text);
create function public.join_league(p_invite_code text, p_team_id int, p_team_name text, p_manager_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
  v_teams jsonb;
  v_updated_teams jsonb;
begin
  select id into v_league_id from public.leagues where invite_code = p_invite_code;
  if v_league_id is null then
    raise exception 'invite code not found';
  end if;

  -- Atomar prüfen + eintragen: unique(league_id, team_id) verhindert, dass
  -- zwei Personen gleichzeitig dasselbe Team claimen (Race Condition).
  insert into public.league_members (league_id, user_id, team_id)
  values (v_league_id, auth.uid(), p_team_id);

  select teams into v_teams from public.league_state where id = v_league_id::text;
  select jsonb_agg(
    case when (t->>'id')::int = p_team_id
      then t || jsonb_build_object('name', p_team_name, 'manager', coalesce(nullif(p_manager_name, ''), t->>'manager'), 'isHuman', true, 'personality', 'human')
      else t
    end
  ) into v_updated_teams
  from jsonb_array_elements(v_teams) t;

  update public.league_state set teams = v_updated_teams where id = v_league_id::text;
  return true;
end;
$$;
grant execute on function public.join_league(text, int, text, text) to authenticated;

-- ── NFL-Tippspiel (Phase 7): komplett unabhängig von der Fantasy-Liga ────────
-- Pro Google/Discord/Magic-Link-Account, nicht pro Fantasy-Team. Globale
-- Rangliste über alle Nutzer der App hinweg, nicht auf eine Liga beschränkt.

create table if not exists public.tippspiel_players (
  user_id uuid primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);
alter table public.tippspiel_players enable row level security;

drop policy if exists "anyone authenticated can view display names" on public.tippspiel_players;
create policy "anyone authenticated can view display names" on public.tippspiel_players for select using (auth.role() = 'authenticated');
drop policy if exists "users manage their own display name" on public.tippspiel_players;
create policy "users manage their own display name" on public.tippspiel_players for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.tippspiel_picks (
  user_id uuid not null references public.tippspiel_players(user_id) on delete cascade,
  season_year integer not null,
  week integer not null,
  game_id text not null,
  picked_team text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, season_year, week, game_id)
);
alter table public.tippspiel_picks enable row level security;

-- Bewusst offen für SELECT (auch fremde Picks lesbar): das ist der Kern eines
-- Tippspiel-Pools unter Freunden — reine Spielvorhersagen, keine sensiblen
-- Liga-/Team-Daten. Schreiben darf jeder nur für sich selbst.
drop policy if exists "anyone authenticated can view all picks" on public.tippspiel_picks;
create policy "anyone authenticated can view all picks" on public.tippspiel_picks for select using (auth.role() = 'authenticated');
drop policy if exists "users manage their own picks" on public.tippspiel_picks;
create policy "users manage their own picks" on public.tippspiel_picks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
