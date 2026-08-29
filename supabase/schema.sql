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

drop policy if exists "members can view their leagues" on public.leagues;
create policy "members can view their leagues" on public.leagues for select using (
  exists (select 1 from public.league_members m where m.league_id = leagues.id and m.user_id = auth.uid())
);
drop policy if exists "anyone authenticated can look up a league by invite code" on public.leagues;
create policy "anyone authenticated can look up a league by invite code" on public.leagues for select using (auth.role() = 'authenticated');
drop policy if exists "owners can update their league" on public.leagues;
create policy "owners can update their league" on public.leagues for update using (owner_id = auth.uid());
drop policy if exists "authenticated users can create a league" on public.leagues;
create policy "authenticated users can create a league" on public.leagues for insert with check (owner_id = auth.uid());

drop policy if exists "members can view league_members of their leagues" on public.league_members;
create policy "members can view league_members of their leagues" on public.league_members for select using (auth.role() = 'authenticated');
drop policy if exists "users can join a league by inserting their own membership" on public.league_members;
create policy "users can join a league by inserting their own membership" on public.league_members for insert with check (user_id = auth.uid());
drop policy if exists "owners can manage memberships" on public.league_members;
create policy "owners can manage memberships" on public.league_members for delete using (
  exists (select 1 from public.leagues l where l.id = league_members.league_id and l.owner_id = auth.uid())
);

-- league_state / season_state: von "gehört exakt einem User" auf
-- "gehört allen Mitgliedern dieser Liga" umstellen.
drop policy if exists "users manage their own league_state" on public.league_state;
create policy "members manage their league_state" on public.league_state for all using (
  exists (select 1 from public.league_members m where m.league_id = league_state.id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.league_members m where m.league_id = league_state.id and m.user_id = auth.uid())
);

drop policy if exists "users manage their own season_state" on public.season_state;
create policy "members manage their season_state" on public.season_state for all using (
  exists (select 1 from public.league_members m where m.league_id = season_state.id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.league_members m where m.league_id = season_state.id and m.user_id = auth.uid())
);

-- Migration bestehender Solo-Ligen: für jede vorhandene league_state-Zeile
-- eine Liga mit DERSELBEN ID anlegen (damit die Zeile weiter referenziert
-- werden kann) und den bisherigen Eigentümer als Mitglied seines "isHuman"-
-- Teams eintragen. Mehrfaches Ausführen ist sicher (on conflict do nothing).
insert into public.leagues (id, owner_id)
select ls.id::uuid, ls.id::uuid from public.league_state ls
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
on conflict (league_id, user_id) do nothing;
