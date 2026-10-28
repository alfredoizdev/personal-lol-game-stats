-- public.rank_snapshots — the player's own ranked standing as the phone read
-- it (owner, 2026-10-27: "sí hay que mostrar el LP"). Riot's match data has
-- no LP, so LanePulse records league-v4 (tier, division, LP, season W/L) each
-- time it changes; between two rows whose record grew by one game, the LP
-- difference belongs to the one ranked game of that queue played in between
-- (packages/shared/src/lp-changes.ts). Append-only, own data only, per Riot
-- account (puuid). Written and read by the phone with the user's JWT under RLS.

create table public.rank_snapshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  puuid         text not null,
  queue         text not null check (queue in ('solo','flex')),
  tier          text not null,
  division      text not null default '',
  league_points integer not null,
  wins          integer not null,
  losses        integer not null,
  taken_at      timestamptz not null default now()
);

create index rank_snapshots_lookup
  on public.rank_snapshots (user_id, puuid, queue, taken_at desc);

alter table public.rank_snapshots enable row level security;

create policy rank_snapshots_select_own on public.rank_snapshots
  for select using (auth.uid() = user_id);

create policy rank_snapshots_insert_own on public.rank_snapshots
  for insert with check (auth.uid() = user_id);

create policy rank_snapshots_delete_own on public.rank_snapshots
  for delete using (auth.uid() = user_id);

grant select, insert, delete on public.rank_snapshots to authenticated;
grant all on public.rank_snapshots to service_role;
