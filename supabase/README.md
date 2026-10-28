# Supabase source for LanePulse

LanePulse shares the RiftLens Supabase project. This directory is the **source
of truth** for the functions and migrations LanePulse adds; the RiftLens repo
(`~/Desktop/lol-app-ui/desktop-app/supabase/`) is the one linked to the project,
so every file here is copied there verbatim in the same change and deployed from
there (design doc, section 3).

| Path | Purpose |
|---|---|
| `functions/ranked-entries/` | Riot LEAGUE-V4 `entries/by-puuid` proxy plus SUMMONER-V4 for the level: the player's own Solo/Duo and Flex standing (tier, division, LP, W/L) and summoner level. No server cache; the phone keeps it an hour. |
| `functions/match-timeline/` | Riot MATCH-V5 timeline proxy; caches the full blob, returns a reduced per-minute series (`reduce.ts`, unit-tested from `packages/shared/tests/timeline-reduce.test.ts`). |
| `migrations/20261022000001_match_timeline_cache.sql` | `match_timeline_cache` table (service_role only). |
| `migrations/20261022000002_pre_match_focus.sql` | `pre_match_focus` table: append-only personal goals per Riot account, RLS own (read/written by the phone). |
| `migrations/20261023000001_lanepulse_push_tokens.sql` | `lanepulse_push_tokens`: Expo push tokens of LanePulse phones, RLS own (phone upserts, desktop reads/revokes). Separate from RiftLens `push_tokens` so pushes never cross apps. |
| `migrations/20261023000002_notification_prefs.sql` | `notification_prefs`: goal-push opt-in (`goal_push`, default off) and cadence (`goal_push_mode` change\|interval), RLS own. |
| `migrations/20261023000004_lanepulse_push_tokens_ownership.sql` | Trigger: the last account to register a device token owns it (other users' active rows for that token are revoked) — shared phones never receive another account's pushes. |
| `migrations/20261023000005_pre_match_focus_standing.sql` | Standing goals: `pre_match_focus.target` nullable (null = recommended for the role), role check admits `ANY` (champion_id 0). |
| `migrations/20261027000001_rank_snapshots.sql` | `rank_snapshots`: the player's own league-v4 standing each time the phone saw it move, RLS own (append-only). Gives each ranked game its LP change. |
| `migrations/20261023000003_realtime_lanepulse_private.sql` | Realtime Authorization policies on `realtime.messages`: broadcast on the private topic `lanepulse:<uid>` only for that user (Live channel, Phase 7). |

Deploy (from the RiftLens repo, after copying):

```bash
cd ~/Desktop/lol-app-ui/desktop-app
supabase db push                         # applies the new migration only
supabase functions deploy match-timeline
supabase functions deploy ranked-entries
```

The Riot key never lives in either repo: it is the Supabase secret `RIOT_API_KEY`
(renew with `~/Desktop/lol-app-ui/desktop-app/scripts/set-riot-key.sh RGAPI-…`).
