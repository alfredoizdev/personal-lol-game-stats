# LanePulse — account deletion verification

`Delete account and data` in Profile calls the `delete-account` Edge Function
(RiftLens repo, `supabase/functions/delete-account/index.ts`), which deletes
the user from `auth.users` with the admin API. What goes with it is decided by
the foreign keys below. All migrations live in
`~/Desktop/lol-app-ui/desktop-app/supabase/migrations/`; the LanePulse ones
are also in `supabase/migrations/` of this repo.

| Table | Holds for LanePulse | FK to the user | On user delete | Note |
|---|---|---|---|---|
| `profiles` | display name, `current_puuid` | `user_id → auth.users(id)` | **cascade** | `20260527000001_initial_schema.sql:17` |
| `linked_riot_accounts` | Riot ID, puuid, region, icon | `user_id → auth.users(id)` | **cascade** | `20260619000004_linked_riot_accounts.sql:19` |
| `pre_match_focus` | personal goals | `user_id → auth.users(id)` | **cascade** | `20261022000002_pre_match_focus.sql` |
| `lanepulse_push_tokens` | Expo push tokens | `user_id → auth.users(id)` | **cascade** | `20261023000001_lanepulse_push_tokens.sql` |
| `notification_prefs` | goal push opt-in | `user_id → auth.users(id)` | **cascade** | `20261023000002_notification_prefs.sql` |
| `subscriptions`, `matches`, `last_game_snapshots`, `push_tokens`, `notifications`, `focus_quests`, coaching tables | RiftLens data (LanePulse writes none of them) | `user_id → auth.users(id)` | **cascade** | same project, same user |
| `riot_account_cache` | Riot ID → puuid lookup | none (keyed by game_name + tag_line) | kept | public account identifiers from account-v1; no link to the user |
| `match_details_cache` | match-v5 blobs | none (keyed by match id) | kept | public match data shared by all ten players; no user column |
| `match_timeline_cache` | match-v5 timelines | none (keyed by match id) | kept | same |

The Privacy Policy ("Deleting your data") describes exactly this: account,
linked Riot accounts, goals, notification settings and push tokens are deleted
immediately; cached match data keyed by match id is kept as public match data.
The Profile confirmation dialog lists the same items.

Live snapshots are never written to the database (Realtime broadcast only), so
there is nothing to delete for the Live tab.

**Manual check for the submission:** create a throwaway account, link a Riot
ID, save a goal, turn on goal updates, delete the account from Profile, then
in the Supabase dashboard confirm no row with that user id remains in
`profiles`, `linked_riot_accounts`, `pre_match_focus`, `lanepulse_push_tokens`
or `notification_prefs`.
