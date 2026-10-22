# Supabase source for LanePulse

LanePulse shares the RiftLens Supabase project. This directory is the **source
of truth** for the functions and migrations LanePulse adds; the RiftLens repo
(`~/Desktop/lol-app-ui/desktop-app/supabase/`) is the one linked to the project,
so every file here is copied there verbatim in the same change and deployed from
there (design doc, section 3).

| Path | Purpose |
|---|---|
| `functions/match-timeline/` | Riot MATCH-V5 timeline proxy; caches the full blob, returns a reduced per-minute series (`reduce.ts`, unit-tested from `packages/shared/tests/timeline-reduce.test.ts`). |
| `migrations/20261022000001_match_timeline_cache.sql` | `match_timeline_cache` table (service_role only). |

Deploy (from the RiftLens repo, after copying):

```bash
cd ~/Desktop/lol-app-ui/desktop-app
supabase db push                         # applies the new migration only
supabase functions deploy match-timeline
```

The Riot key never lives in either repo: it is the Supabase secret `RIOT_API_KEY`
(renew with `~/Desktop/lol-app-ui/desktop-app/scripts/set-riot-key.sh RGAPI-…`).
