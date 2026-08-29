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
alter publication supabase_realtime add table public.league_state;

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

alter publication supabase_realtime add table public.season_state;
