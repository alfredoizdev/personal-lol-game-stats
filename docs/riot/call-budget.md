# LanePulse — Riot API call budget

Every number below is derived from a constant in the code (file:line cited)
and from the three Edge Functions LanePulse calls. The Riot key is only ever
used server-side by those functions (`RIOT_API_KEY` secret); no client holds it.

Production key limits requested: **500 requests / 10 s** and **30,000 / 10 min**
(the standard production allocation; the application asks for exactly that).

## Endpoints and when they are called

| Riot endpoint | Edge Function | Called when | Cache |
|---|---|---|---|
| account-v1 `accounts/by-riot-id/{name}/{tag}` | `link-riot-account` (RiftLens repo), `match-list-ids` on a cache miss | Linking a Riot ID; first match-list call for a Riot ID | `riot_account_cache` by (game_name, tag_line), never expires |
| match-v5 `matches/by-puuid/{puuid}/ids?count=N` | `match-list-ids` | Matches tab mount (N = 20, `useRecentMatches` default) when older than 90 s · pull-to-refresh · Prepare / Performance (N = 100) when older than 10 min · Match Review baseline (N = 20, shares the Matches query) | TanStack Query only (`staleTime` 90 s / 10 min); the function always calls Riot |
| match-v5 `matches/{id}` | `match-detail` | First time any user opens a game: Matches rows (10 visible, +5 per scroll, max 20), Performance/Prepare backfill (100 per account, once), a new game after it ends | `match_details_cache` by match id, forever (`staleTime: Infinity` on the phone as well) |
| match-v5 `matches/{id}/timeline` | `match-timeline` | First time a Match Review is opened for a game | `match_timeline_cache` by match id, forever |
| Live Client Data API (`https://127.0.0.1:2999`) | none (desktop, local) | While a game runs, once per second | Not a Riot Games API server call; no key, no rate limit |
| LCU (`lockfile` port) | none (desktop, local) | Gameflow phase and the signed-in Riot ID | Local only |

Sources: `apps/mobile/src/hooks/useRecentMatches.ts:21` (`staleTime: Infinity` for details), `:39` (ids `staleTime: 90 * 1000`), `:45` (`INITIAL_PAGE`), `apps/mobile/src/lib/paging.ts:2` (`INITIAL_PAGE = 10`), `apps/mobile/src/lib/backfill.ts:4-5` (`BACKFILL_COUNT = 100`, `CHUNK = 20`), `apps/mobile/src/hooks/useOwnHistory.ts:49-51` (100 ids, `staleTime: 10 * 60 * 1000`), `apps/mobile/src/hooks/useBaseline.ts:8,21` (`BASELINE_COUNT = 20`, 90 s), `apps/mobile/src/hooks/useMatchTimeline.ts:14` (`staleTime: Infinity`), `apps/mobile/src/app/(app)/(tabs)/performance.tsx` (`AUTO_LOAD = BACKFILL_COUNT`), Edge Functions `match-list-ids/index.ts:160-230`, `match-detail/index.ts:189-260`, `match-timeline/index.ts:119-143` in `~/Desktop/lol-app-ui/desktop-app/supabase/functions`.

No TanStack `focusManager` is wired on the phone, so queries do not refetch on app focus; they refetch only on mount when stale, on pull-to-refresh, or when a tab's window needs ids it does not have.

## Worst case per user

Assumptions: an active player, 10 games a day, opens the app 20 times a day, opens every game's review once.

| Call | First day | Each later day |
|---|---|---|
| account-v1 | 1 per linked Riot ID | 0 |
| match ids (20) | 20 (one per app open, 90 s stale) | 20 |
| match ids (100) | 2–3 (10 min stale, Performance/Prepare) | 2–3 |
| match detail | 100 (backfill, once per account) + 10 new games | 10 |
| match timeline | 10 | 10 |
| **Total** | **≈ 145** | **≈ 45** |

Per 10 seconds, the only burst is the one-time backfill: 100 details in
chunks of 20 (`CHUNK = 20`, `backfill.ts:5`), each chunk awaited before the
next (`backfill.ts:54-65`). With an Edge Function round trip of about 300 ms
that is at most **≈ 20 requests per 10 s per user**, and only on the first
visit to Performance or Prepare. A `RATE_LIMITED` answer stops the run
(`backfill.ts:66`) and the screen shows a Retry; nothing loops.

Game details and timelines are cached by match id, so a game already fetched
for one of its ten players costs nothing for the others.

## Against the production limits

- 500 req / 10 s: 25 simultaneous first-time backfills fit; beyond that the
  functions return 429 → the app stops the run and asks the user to retry
  later. Everything else is single requests spread over minutes.
- 30,000 req / 10 min: at 45 calls per user-day the steady state supports
  tens of thousands of daily active users; the first-day cost of 145 calls
  supports ~2,000 new accounts per 10 minutes before caching kicks in.

Nothing polls Riot in the background: the desktop companion never calls the
Riot Games API (only the local Live Client Data API and the LCU), and the
phone makes no request while it is closed.
