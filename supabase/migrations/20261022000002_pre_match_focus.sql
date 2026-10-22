-- public.pre_match_focus — the player's personal goal for the next game
-- (Phase 5). Append-only: every "Save goal" inserts a row; the goal in force
-- is the newest row per (puuid, champion_id, role), and Match Review reads
-- the newest row set at or before the end of that game, so changing a goal
-- later never rewrites an older review.
--
-- Scoped per Riot account (puuid), not per user: a goal set on one linked
-- account never shows on another. Written and read by the phone with the
-- user's own JWT under RLS; no Edge Function involved.
--
-- metric ∈ csPerMin | visionPerMin | deathsPer10 | kpPct (validated by the app).
-- champion_id is the Data Dragon numeric key.

create table public.pre_match_focus (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  puuid        text not null,
  champion_id  integer not null,
  role         text not null,
  metric       text not null,
  target       numeric not null,
  set_at       timestamptz not null default now()
);

create index pre_match_focus_lookup
  on public.pre_match_focus (user_id, puuid, champion_id, role, set_at desc);

alter table public.pre_match_focus enable row level security;

create policy pre_match_focus_select_own on public.pre_match_focus
  for select using (auth.uid() = user_id);

create policy pre_match_focus_insert_own on public.pre_match_focus
  for insert with check (auth.uid() = user_id);

create policy pre_match_focus_delete_own on public.pre_match_focus
  for delete using (auth.uid() = user_id);

grant select, insert, delete on public.pre_match_focus to authenticated;
grant all on public.pre_match_focus to service_role;
