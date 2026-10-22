# Phase 2 — Recent Matches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Matches tab lists the active account's last 20 real matches and opening one shows that player's stats and their lane matchup, with every Riot call going through the existing cached Edge Functions.

**Architecture:** A pure Match-v5 summarizer lives in `@lpp/shared` (tested on inline fixtures). The mobile app calls `match-list-ids` (ids, 90 s server cache) and `match-detail` (full blob, permanent server cache) through a thin typed client, keeps results in TanStack Query, and renders list + detail with the mockup 06/07 layout. No new tables, no new Edge Functions, no Riot key on the client.

**Tech Stack:** TypeScript, Vitest, Expo Router, TanStack Query, Data Dragon CDN for champion and item icons.

**Spec:** `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md` (sections 3, 5 "Fuente de verdad", 6.1, 6.2, 8.2, 8.3, 9 row 2, 10 exclusions).

## Global Constraints

- Riot API key never on the client. Riot is reached only via `supabase.functions.invoke('match-list-ids' | 'match-detail')`.
- Each match detail is fetched from Riot at most once (server cache `match_details_cache`). The client never calls `match-detail` for an id it already holds in memory.
- Timeline is NOT fetched in this phase (Phase 3).
- Nulls, never fake zeros: `csPerMin` is `null` when duration < 60 s; opponent is `null` when the lane cannot be identified unambiguously.
- `teamPosition` is the only lane source. ARAM/Arena/modes with empty `teamPosition` get `role: null` and no opponent.
- Remake: `gameEndedInEarlySurrender === true` or `gameDuration < 300`. Remakes are listed (muted) but excluded from the header aggregates.
- Copy fixed by the mockups: tab title "My Matches", subtitle "Recent performance", header card "Last 10 Games" / "Overall Performance", list section "Recent Games", detail title "Match Review", result words "Victory" / "Defeat" / "Remake".
- No tactical advice, no 10-player table. Detail shows the player and the lane opponent only.
- `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` green at the end of every task. Commit after every task with the Claude attribution line.

## Review Focus

1. A participant list where two enemies share the player's `teamPosition` (role swap / bugged data): opponent must be `null`, not the first match. Test in Task 1.
2. Match-v5 `championName` that differs from the Data Dragon image key (Wukong → `MonkeyKing`, Fiddlesticks casing, Nunu & Willump → `Nunu`): icon URL must not 404. Test in Task 3.
3. `match-list-ids` returning `KEY_INVALID` (dev key expired, HTTP 401): the list must show "Riot key expired" with the renewal hint, not a generic error, and must not retry in a loop. Test in Task 2.
4. An id whose `match-detail` returns `NOT_FOUND` (archived/purged): the list must render the other 19 and skip that one, not blank the whole list. Test in Task 4.
5. Pull-to-refresh while a previous refresh is in flight, and switching the active account in Profile: queries must be keyed by `puuid` so the list never shows another account's games. Test in Task 2.

---

### Task 1: Match-v5 summarizer in `@lpp/shared`

**Files:**
- Create: `packages/shared/src/match-v5.ts`, `packages/shared/src/match-summary.ts`, `packages/shared/src/queue-label.ts`, `packages/shared/src/format.ts`
- Test: `packages/shared/tests/match-summary.test.ts`, `packages/shared/tests/format.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces:
  - `type MatchV5 = { metadata: { matchId: string; participants: string[] }; info: { gameCreation: number; gameDuration: number; gameEndedInEarlySurrender?: boolean; gameMode: string; queueId: number; participants: MatchV5Participant[] } }` and `type MatchV5Participant` with: `puuid, riotIdGameName?, riotIdTagline?, championId, championName, teamId, teamPosition, kills, deaths, assists, totalMinionsKilled, neutralMinionsKilled, visionScore, wardsPlaced?, totalDamageDealtToChampions, goldEarned, champLevel, win, item0..item6`.
  - `type Role = 'TOP'|'JUNGLE'|'MIDDLE'|'BOTTOM'|'UTILITY'`
  - `type PlayerLine = { puuid: string; championId: number; championName: string; role: Role | null; kills: number; deaths: number; assists: number; cs: number; csPerMin: number | null; visionScore: number; damageToChampions: number; gold: number; level: number; items: number[] /* 6 slots, 0 = empty */; trinket: number; win: boolean }`
  - `type MatchSummary = { matchId: string; queueId: number; queueLabel: string; gameMode: string; durationSec: number; startedAt: string /* ISO */; remake: boolean; me: PlayerLine; opponent: PlayerLine | null }`
  - `summarizeMatch(blob: MatchV5, puuid: string): MatchSummary | null` (null when the puuid is not a participant)
  - `queueLabel(id: number): string` (420 "Ranked Solo", 440 "Ranked Flex", 400 "Normal Draft", 430 "Normal Blind", 450 "ARAM", 490 "Quickplay", 700 "Clash", 900 "ARURF", 1300 "Nexus Blitz", 1700 "Arena", 1900 "URF", else "Other")
  - `formatDuration(sec: number): string` → `"28:14"`; `formatKda(k,d,a): string` → `"5.0 KDA"`, deaths 0 → `"Perfect"`; `relativeTime(iso: string, nowMs: number): string` → "just now", "5 min ago", "2 hours ago", "1 day ago", "3 days ago", date `"Oct 3"` beyond 7 days.

- [ ] **Step 1:** Write `tests/match-summary.test.ts` with an inline 10-participant blob builder `blob({ me, enemies, allies, duration = 1694, queueId = 420 })`. Cases: me MIDDLE vs one enemy MIDDLE → opponent set with cs = minions + neutral and `csPerMin = round1(cs / (duration/60))`; two enemies with `teamPosition: 'MIDDLE'` → `opponent === null` (Review Focus 1); `teamPosition: ''` (ARAM) → `role === null` and `opponent === null`; `gameDuration: 120, gameEndedInEarlySurrender: true` → `remake === true` and `csPerMin` still computed; `gameDuration: 30` → `csPerMin === null`; unknown puuid → `null`; items `[item0..item5]`, `trinket = item6`.
- [ ] **Step 2:** Write `tests/format.test.ts`: `formatDuration(1694)` = `"28:14"`, `formatDuration(3605)` = `"60:05"`; `formatKda(12,4,8)` = `"5.0 KDA"`, `formatKda(3,0,2)` = `"Perfect"`; `relativeTime` for 30 s, 5 min, 2 h, 1 day, 3 days, 10 days (= `"Oct 11"` when now is 2026-10-21T12:00Z and the match is 2026-10-11T12:00Z); `queueLabel(420)`, `queueLabel(9999)` = `"Other"`.
- [ ] **Step 3:** Run `pnpm --filter @lpp/shared test`. Expected: FAIL, modules not found.
- [ ] **Step 4:** Implement the four modules; export from `index.ts`.
- [ ] **Step 5:** Run `pnpm -r test && pnpm -r typecheck && pnpm -r lint`. Expected: PASS.
- [ ] **Step 6:** Commit `feat(shared): match-v5 summarizer, queue labels, formatting`.

---

### Task 2: Riot data client and queries on mobile

**Files:**
- Create: `apps/mobile/src/lib/riot-api.ts`, `apps/mobile/src/hooks/useRecentMatches.ts`
- Test: `apps/mobile/tests/riot-api.test.ts`

**Interfaces:**
- Consumes: `LinkedAccount` (Task 6 Phase 1), `summarizeMatch`, `MatchV5`, `MatchSummary` (Task 1).
- Produces:
  - `type RiotErrorCode = 'KEY_INVALID' | 'RATE_LIMITED' | 'NOT_FOUND' | 'UNKNOWN'`; `class RiotApiError extends Error { code: RiotErrorCode }`
  - `fetchMatchIds(client, input: { gameName: string; tagLine: string; region: Region; count?: number }): Promise<string[]>` — invokes `match-list-ids` with that body; a body `{ error }` or an invoke error throws `RiotApiError` (401 → KEY_INVALID, 429 → RATE_LIMITED, 404 → NOT_FOUND, else body code or UNKNOWN).
  - `fetchMatchDetail(client, input: { matchId: string; region: Region }): Promise<MatchV5>` — same mapping.
  - `isRetryableRiotError(err: unknown): boolean` — true only for RATE_LIMITED and UNKNOWN (never KEY_INVALID / NOT_FOUND).
  - `useRecentMatches(account: LinkedAccount | null, count = 20)` → `{ ids: UseQueryResult<string[]>, matches: Array<{ matchId: string; status: 'loading'|'error'|'ready'; summary?: MatchSummary; error?: RiotErrorCode }>, refresh(): Promise<void>, isRefreshing: boolean }`. Query keys: `['match-ids', puuid, count]` (staleTime 90 s) and `['match-detail', matchId]` (staleTime Infinity, gcTime 24 h, `retry: (n, err) => n < 2 && isRetryableRiotError(err)`). Details are loaded with `useQueries` in id order. Summaries are computed with `summarizeMatch(blob, account.puuid)`.

- [ ] **Step 1:** Write `tests/riot-api.test.ts` with a fake `functions.invoke`: ids success; body `{ error: 'RATE_LIMITED' }` → throws `RiotApiError` code RATE_LIMITED; invoke error with `context.status 401` → KEY_INVALID (Review Focus 3); 404 → NOT_FOUND; `isRetryableRiotError` false for KEY_INVALID/NOT_FOUND, true for RATE_LIMITED; `fetchMatchDetail` passes `{ matchId, region }` and returns the blob.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement `riot-api.ts`. Expected: PASS.
- [ ] **Step 3:** Implement `useRecentMatches` as specified. Keys include `puuid` (Review Focus 5). `refresh()` invalidates only `['match-ids', puuid, count]`.
- [ ] **Step 4:** `pnpm -r test && pnpm -r typecheck && pnpm -r lint`. Commit `feat(mobile): riot match client and recent-matches query`.

---

### Task 3: Data Dragon assets

**Files:**
- Create: `packages/shared/src/ddragon.ts`, `apps/mobile/src/hooks/useDdragonVersion.ts`, `apps/mobile/src/components/ChampionPortrait.tsx`, `apps/mobile/src/components/ItemRow.tsx`
- Test: `packages/shared/tests/ddragon.test.ts`

**Interfaces:**
- Produces:
  - `championImageKey(championName: string): string` — identity except: `"Wukong" → "MonkeyKing"`, `"Nunu & Willump" → "Nunu"`, `"Renata Glasc" → "Renata"`, `"Cho'Gath" → "Chogath"`, `"Kai'Sa" → "Kaisa"`, `"Kha'Zix" → "Khazix"`, `"Vel'Koz" → "Velkoz"`, `"Rek'Sai" → "RekSai"`, `"Kog'Maw" → "KogMaw"`, `"Bel'Veth" → "Belveth"`, `"K'Sante" → "KSante"`, `"Dr. Mundo" → "DrMundo"`, `"Jarvan IV" → "JarvanIV"`, `"Lee Sin" → "LeeSin"`, `"Master Yi" → "MasterYi"`, `"Miss Fortune" → "MissFortune"`, `"Tahm Kench" → "TahmKench"`, `"Twisted Fate" → "TwistedFate"`, `"Xin Zhao" → "XinZhao"`, `"Aurelion Sol" → "AurelionSol"`, `"LeBlanc" → "Leblanc"`, `"Fiddlesticks"/"FiddleSticks" → "Fiddlesticks"`; generic rule: strip spaces, apostrophes and dots. Match-v5 already returns most names in image-key form, so the map is a safety net.
  - `championIconUrl(version, championName)`, `itemIconUrl(version, itemId)`, `profileIconUrl(version, id)`, `DDRAGON_FALLBACK_VERSION = '15.20.1'`.
  - `useDdragonVersion(): string` — fetches `https://ddragon.leagueoflegends.com/api/versions.json` (staleTime 24 h), returns `[0]` or the fallback while loading/erroring.
  - `ChampionPortrait({ championName, size, ring: 'win'|'loss'|'none' })`, `ItemRow({ items, trinket, version })` (6 slots + trinket, empty slot = dark square).

- [ ] **Step 1:** Write `tests/ddragon.test.ts`: the special cases above (Review Focus 2), the generic rule (`"Nunu & Willump"`), and that `itemIconUrl('15.20.1', 3031)` ends with `/15.20.1/img/item/3031.png`.
- [ ] **Step 2:** Run. FAIL. Implement. PASS.
- [ ] **Step 3:** Implement the hook and the two components. Replace the hard-coded `15.1.1` in `AccountCard.tsx` with `profileIconUrl(useDdragonVersion(), id)`.
- [ ] **Step 4:** `pnpm -r test && pnpm -r typecheck && pnpm -r lint`. Commit `feat: data dragon assets and champion/item components`.

---

### Task 4: Matches tab

**Files:**
- Create: `apps/mobile/src/lib/match-aggregates.ts`, `apps/mobile/src/components/MatchRow.tsx`, `apps/mobile/src/components/PerformanceHeader.tsx`, `apps/mobile/src/components/RiotErrorView.tsx`
- Modify: `apps/mobile/src/app/(app)/matches.tsx`
- Test: `apps/mobile/tests/match-aggregates.test.ts`

**Interfaces:**
- Consumes: `useRecentMatches`, `useLinkedAccount`, `ChampionPortrait`, `ItemRow`, formatters.
- Produces:
  - `aggregateMatches(summaries: MatchSummary[], limit = 10): { games: number; avgKda: number | null; avgCsPerMin: number | null; winRate: number | null }` — takes the first `limit` non-remake summaries; `avgKda` = mean of per-game `(k+a)/max(d,1)` rounded to 1 decimal; `avgCsPerMin` ignores games with `csPerMin === null`; nulls when `games === 0`.
  - Screen states: no account → link prompt; ids loading → skeleton rows; `KEY_INVALID` → `RiotErrorView` "Riot key expired. Renew it with set-riot-key.sh"; `RATE_LIMITED` → "Riot is busy, pull to retry"; other error → "Couldn't load matches" + Retry; empty ids → "No recent matches for this account"; detail errors per row: `NOT_FOUND` rows are dropped, other row errors show a muted "Couldn't load" row (Review Focus 4).
  - `MatchRow` layout per mockup 06: portrait with win/loss ring, "Victory"/"Defeat"/"Remake" in win/loss/muted colour, champion name, role, `K / D / A` + `formatKda`, `csPerMin` + "CS/min" (or "—"), `formatDuration` + `relativeTime`, `ItemRow`; tapping navigates to `/(app)/match/[matchId]`.
  - `PerformanceHeader` per mockup: "Last 10 Games", "Overall Performance", three stats (Avg KDA, CS / min, Win Rate) — no delta arrows (no baseline yet), no "Needs work" (Phase 3).

- [ ] **Step 1:** Write `tests/match-aggregates.test.ts`: 3 games → correct means and win rate; remakes excluded; `csPerMin: null` ignored in the CS mean; empty → nulls; `limit` respected.
- [ ] **Step 2:** Run. FAIL. Implement. PASS.
- [ ] **Step 3:** Implement the components and the screen (FlatList, `refreshing` + `onRefresh` → `refresh()`, section title "Recent Games (N)").
- [ ] **Step 4:** Manual: `pnpm --filter @lpp/mobile ios` with the owner's account signed in; the list shows real matches with icons; pull to refresh works; screenshot saved to `docs/screenshots/phase2-matches.png`.
- [ ] **Step 5:** `pnpm -r test && pnpm -r typecheck && pnpm -r lint`. Commit `feat(mobile): matches tab with real recent matches`.

---

### Task 5: Match Review screen

**Files:**
- Create: `apps/mobile/src/app/(app)/match/[matchId].tsx`, `apps/mobile/src/components/MatchHero.tsx`, `apps/mobile/src/components/LaneMatchupCard.tsx`
- Modify: `apps/mobile/src/app/(app)/_layout.tsx` (register `match/[matchId]` with `href: null`)

**Interfaces:**
- Consumes: the `['match-detail', matchId]` query (already cached by the list), `useLinkedAccount`, components from Task 3.
- Produces:
  - Screen "Match Review" with subtitle `queueLabel`; `MatchHero`: portrait, result word, champion name, role, `ItemRow`, four stats (K/D/A + KDA, CS/min, Match Duration, Played = relativeTime).
  - `LaneMatchupCard`: "Lane Matchup", You vs Enemy portraits with cyan/red rings, rows Kills, CS, CS/min, Vision, Damage; when `opponent === null` shows "Lane opponent not identified for this game". No ranks (spec 10).
  - Placeholder card "Analysis coming soon" where mockup 07 shows summary/strengths/needs work (Phase 3).
  - Back button returns to the list; the screen fetches the detail itself when opened by deep link (not only from the list).

- [ ] **Step 1:** Implement the route and components. (UI only; the data path is covered by Tasks 1–2 tests.)
- [ ] **Step 2:** Manual: open a real match from the list; stats match the Riot client's post-game screen for that match (KDA, CS, duration); opponent shown for a ranked game and absent for an ARAM. Screenshot `docs/screenshots/phase2-review.png`.
- [ ] **Step 3:** `pnpm -r test && pnpm -r typecheck && pnpm -r lint`. Commit `feat(mobile): match review screen`.

---

### Task 6: Phase 2 acceptance

**Files:**
- Modify: `DEVELOPMENT_PROGRESS.md`, `docs/superpowers/specs/...` (only if a decision changed)

- [ ] **Step 1:** Riot budget check: with Metro logs or Supabase function logs, opening the list cold = 1 `match-list-ids` + ≤20 `match-detail`; reopening the same match = 0 new Riot calls (served from `match_details_cache`). Record the counts.
- [ ] **Step 2:** `grep -rn "RGAPI-" apps packages --include='*.ts*'` → none.
- [ ] **Step 3:** Update `DEVELOPMENT_PROGRESS.md`: tick Phase 2, record verification, limitations (no timeline, no analysis chips, no champion filter).
- [ ] **Step 4:** `pnpm -r lint && pnpm -r typecheck && pnpm -r test`. Commit `docs: phase 2 progress report`. Push after the secret scan.
