-- public.match_timeline_cache — persistent cache for the Riot MATCH-V5
-- timeline blob (per-minute participant frames + events). A timeline is
-- immutable once the game ends, so a hit is always valid; no TTL needed.
-- The match-timeline Edge Function checks here before calling Riot,
-- persists the full blob on miss, and answers with a reduced per-minute
-- series either way — so opening the same match review again costs zero
-- Riot calls, for any user.
--
-- Same shape and policy as match_details_cache (20260603000002).

create table public.match_timeline_cache (
  match_id    text primary key,
  region      text not null,
  data        jsonb not null,
  fetched_at  timestamptz not null default now()
);

-- Only looked up by match_id (the PK). No extra index needed.

-- RLS is enabled but no client policies — only service_role reads/writes
-- here. Timelines are public Riot data, but routing everything through
-- the Edge Function keeps the API key as the only gate and keeps the
-- 0.5–2 MB blobs off anon clients.
alter table public.match_timeline_cache enable row level security;

grant all on public.match_timeline_cache to service_role;
