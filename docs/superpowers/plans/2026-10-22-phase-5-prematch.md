# Phase 5 — Pre-match Preparation & Personal Goal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the Live tab while no game runs, the player picks champion + role, sees their own history (summary, toughest lane matchups, a ban to consider) and saves a measurable goal; the goal shows on the Live hero during the game with a neutral status and is evaluated in Match Review.

**Architecture:** A pure engine in `packages/shared/src/prematch/` groups the player's cached matches by champion/role/opponent, computes the default goal and the goal status. Goals are append-only rows in a new `pre_match_focus` table (per Riot account) read/written by the phone with supabase-js under RLS. A chunked, user-triggered backfill of up to 100 match details feeds the history; Data Dragon's `champion.json` supplies the champion list and the name → id lookup for live snapshots. No desktop or payload changes.

**Tech Stack:** TypeScript, Vitest, Expo SDK 58 + Expo Router, TanStack Query, supabase-js (RLS), `@react-native-async-storage/async-storage`, Supabase migration via the RiftLens repo's CLI.

**Spec:** `docs/superpowers/specs/2026-10-22-phase-5-pre-match-design.md` (sections 2.1–2.6 and the decisions in 5). General design: `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md` sections 5 (default goal rule, own-history source), 6.4, 8.5–8.6, 10 (no tactical advice).

## Global Constraints

- Goals: metrics `csPerMin | visionPerMin | deathsPer10 | kpPct`; default metric `visionPerMin` for UTILITY, `csPerMin` otherwise. Default value: average with that champion + role over the most recent 20 analyzable games (≥ 3) → else role average via `buildBaseline` (≥ 3) → else `ROLE_TARGETS` value (`null` for UTILITY csPerMin → empty field). The source is always shown (spec 2.4, 5.4).
- Table `pre_match_focus(id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, puuid text not null, champion_id int not null, role text not null, metric text not null, target numeric not null, set_at timestamptz not null default now())`, index `(user_id, puuid, champion_id, role, set_at desc)`, RLS select/insert/delete own (`auth.uid() = user_id`). Append-only; the goal in force = newest row per `(puuid, champion_id, role)`; fallback = newest row for `(puuid, role)` with any champion (spec 5.1).
- Review lookup: newest row with `set_at ≤ gameCreation + gameDuration` (spec 5.1).
- Toughest matchups and the ban sentence group by `(puuid, role)` over the 100-game window: enemy with the same `teamPosition`; list needs ≥ 2 games vs that champion; "few games" under 3; ban sentence only with ≥ 3 games and win rate < 40 % (spec 2.3, 5.2). Sort by win rate ascending, then games descending, then name.
- Analyzable games only (`ANALYZABLE_QUEUES`, no remakes) everywhere in this phase.
- Backfill: never automatic. Button "Load your last 100 games"; chunks of 20 ids through the existing 4-wide limiter; progress "n of 100"; pauses while a Match Review screen is focused; cached games (the Matches tab's 20) are used immediately (spec 5.3). Riot budget: ≤ 1 `match-list-ids(count 100)` + ≤ 100 `match-detail` once per account.
- Live status copy: "On track" / "Below goal" / "—"; for `deathsPer10` on track means ≤ target. Never advice (spec 2.5).
- Champion names from the Live Client resolve against DDragon `champion.json[*].name` via `championImageKey` (the `SPECIAL` table); unresolved → role fallback only (spec 5.4).
- UI copy in English; no `href: null` navigable screens; charts/series colours as before; `pnpm -r typecheck && pnpm -r lint && pnpm -r test` green per task; one commit per task with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; secret scan before every push; the migration is copied verbatim to `~/Desktop/lol-app-ui/desktop-app/supabase/migrations/` and applied with `supabase db push` from there, command shown to the owner first.

## Review Focus

1. A player with two linked Riot accounts: goals saved on account A must never show on account B's Live or review (per-puuid rows). Test in Task 1 (`goalFor` filters by puuid) and Task 3 (query key includes puuid).
2. The goal was saved during champ select (after `gameCreation`): the review must still find it (cutoff is game end). Test in Task 1.
3. The live snapshot's `championName` is "Nunu & Willump" / "Wukong" / "Cho'Gath": the lookup must resolve to the DDragon id or fall back to the role goal, never to a wrong champion. Test in Task 3 (`championIdByName`).
4. Backfill interrupted (app backgrounded, 429 storm): already-fetched details stay cached and the next press resumes from the missing ids only; never refetches cached ones. Test in Task 3 (`nextChunk` helper).
5. KP goal while the team has 0 kills, or any metric in the first 60 s: status "—", never "Below goal". Test in Task 1 (`goalStatus`).

---

### Task 1: Pre-match engine (shared)

**Files:**
- Create: `packages/shared/src/prematch/history.ts`, `packages/shared/src/prematch/goal.ts`, `packages/shared/src/prematch/index.ts`
- Modify: `packages/shared/src/index.ts` (export `./prematch`)
- Test: `packages/shared/tests/prematch-history.test.ts`, `packages/shared/tests/prematch-goal.test.ts` (reuse the fixture style of `tests/analysis-fixtures.ts`)

**Interfaces:**
- Consumes: `MatchSummary`, `Role`, `ANALYZABLE_QUEUES`, `ROLE_TARGETS`, `buildBaseline`, `metricsOf`, `LiveSnapshotV2`.
- Produces:
  ```ts
  // history.ts
  export type ChampionSummary = { games: number; wins: number; winRate: number | null; avgKda: number | null; avgCsPerMin: number | null; fewGames: boolean }
  export function championSummary(all: MatchSummary[], championId: number, role: Role): ChampionSummary          // analyzable, non-remake, me.championId + me.role; fewGames = games < 3
  export type MatchupRow = { championId: number; championName: string; games: number; wins: number; winRate: number; fewGames: boolean }
  export function toughestMatchups(all: MatchSummary[], role: Role, limit = 5): MatchupRow[]                     // opponent with same role, ≥ 2 games; sort winRate asc, games desc, name
  export function banSuggestion(rows: MatchupRow[], roleLabel: string): string                                     // "You lost 4 of 5 games against Draven as Bot. Consider banning it." | "Not enough games against a single champion to suggest a ban."
  export function playedChampions(all: MatchSummary[], role: Role): Array<{ championId: number; championName: string; games: number }> // desc by games, then name
  export function lastRole(all: MatchSummary[]): Role | null
  // goal.ts
  export type GoalMetric = 'csPerMin' | 'visionPerMin' | 'deathsPer10' | 'kpPct'
  export const GOAL_METRICS: ReadonlyArray<{ key: GoalMetric; label: string; unit: string; step: number; decimals: number; lowerIsBetter: boolean }>
  // csPerMin 'CS / min' step .1 d1; visionPerMin 'Vision score / min' step .05 d2; deathsPer10 'Deaths per 10 min' step .1 d1 lowerIsBetter; kpPct 'Kill participation' unit '%' step 1 d0
  export type Goal = { puuid: string; championId: number; role: Role; metric: GoalMetric; target: number; setAt: string }
  export type DefaultGoal = { metric: GoalMetric; target: number | null; source: 'champion' | 'role' | 'target' | 'none'; n: number }
  export function defaultGoal(all: MatchSummary[], championId: number, role: Role, metric?: GoalMetric): DefaultGoal
  export function goalFor(goals: Goal[], puuid: string, championId: number | null, role: Role, beforeMs?: number): Goal | null // exact champion newest ≤ beforeMs, else any champion same role newest ≤ beforeMs
  export function liveMetrics(s: LiveSnapshotV2): Record<GoalMetric, number | null>                              // csPerMin from s.me; visionPerMin = wardScore / minutes; deathsPer10; kpPct = (k+a)/teamKills; null under 60 s or when inputs are null/0 team kills
  export function goalStatus(goal: Pick<Goal, 'metric' | 'target'>, value: number | null): 'on_track' | 'below' | 'unknown'
  export function goalMet(goal: Pick<Goal, 'metric' | 'target'>, value: number | null): boolean | null
  export function formatGoal(goal: Pick<Goal, 'metric' | 'target'>): string                                       // "7.0 CS/min", "0.60 vision score/min", "≤ 1.5 deaths per 10 min", "55% kill participation"
  ```

- [ ] **Step 1: Write the failing history tests** — `championSummary` (3 games 2 wins → winRate 67, avgKda, avgCsPerMin; ARAM/remake excluded; 2 games → fewGames); `toughestMatchups` (≥ 2 games rule, sort order with a tie on win rate broken by games then name, opponent missing → game ignored, limit 5); `banSuggestion` (≥ 3 games & < 40 % → sentence with numbers and role; 2 games or 50 % → fallback sentence); `playedChampions`; `lastRole`.
- [ ] **Step 2: Write the failing goal tests** — `defaultGoal` (champion with 4 games → 'champion' average; 2 games but role baseline 5 → 'role'; nothing → 'target' with ROLE_TARGETS; UTILITY csPerMin → target null source 'none'; metric default by role); `goalFor` (puuid filter — Review Focus 1; newest wins; `beforeMs` cutoff with a goal set after game start but before game end — Review Focus 2; role fallback); `liveMetrics` + `goalStatus` (Review Focus 5: 0 team kills → kpPct null → 'unknown'; 30 s game → all null; deaths on track when ≤ target); `goalMet`; `formatGoal` strings.
- [ ] **Step 3: Run** `pnpm -F @lpp/shared exec vitest run tests/prematch-*.test.ts` — Expected: FAIL (modules not found).
- [ ] **Step 4: Implement** `history.ts`, `goal.ts`, `index.ts`; export from `packages/shared/src/index.ts`.
- [ ] **Step 5: Run** `pnpm -F @lpp/shared test && pnpm -r typecheck && pnpm -r lint` — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(prematch): own-history grouping, toughest matchups, ban sentence, goals engine"`

---

### Task 2: `pre_match_focus` migration (this repo → RiftLens → db push)

**Files:**
- Create: `supabase/migrations/20261022000002_pre_match_focus.sql`
- Modify: `supabase/README.md` (table row)
- Copy to: `~/Desktop/lol-app-ui/desktop-app/supabase/migrations/20261022000002_pre_match_focus.sql`

- [ ] **Step 1:** Write the migration exactly as the Global Constraints define (table, index, `enable row level security`, three policies `pre_match_focus_select_own` / `_insert_own` / `_delete_own` on `auth.uid() = user_id`, `grant select, insert, delete on public.pre_match_focus to authenticated`, `grant all … to service_role`).
- [ ] **Step 2:** Copy to RiftLens; tell the owner the command; run `cd ~/Desktop/lol-app-ui/desktop-app && supabase db push --yes`. Expected: only `20261022000002_pre_match_focus.sql` applied.
- [ ] **Step 3:** Verify with the anon key + a signed-in JWT is not scriptable here; instead `supabase db query`-free check: insert/select are exercised by Task 3's manual step. Record in the ledger.
- [ ] **Step 4: Commit** — `git commit -m "feat(supabase): pre_match_focus table (append-only goals per Riot account, RLS own)"`

---

### Task 3: Mobile data — goals, champion list, own-history backfill

**Files:**
- Create: `apps/mobile/src/lib/goals.ts`, `apps/mobile/src/hooks/useGoals.ts`, `apps/mobile/src/lib/champions.ts`, `apps/mobile/src/hooks/useChampionList.ts`, `apps/mobile/src/lib/backfill.ts`, `apps/mobile/src/hooks/useOwnHistory.ts`, `apps/mobile/src/lib/prematch-selection.ts`
- Modify: `apps/mobile/src/lib/match-keys.ts` (`goals(puuid)`, `champions(version)`, `ownIds(puuid)`), `apps/mobile/package.json` (via `npx expo install @react-native-async-storage/async-storage`)
- Test: `apps/mobile/tests/champions.test.ts`, `apps/mobile/tests/backfill.test.ts`, `apps/mobile/tests/goals.test.ts`

**Interfaces:**
```ts
// goals.ts
export async function fetchGoals(client: SupabaseClient, userId: string, puuid: string): Promise<Goal[]>           // newest first, last 200 rows
export async function saveGoal(client: SupabaseClient, userId: string, goal: Omit<Goal, 'setAt'>): Promise<void>  // insert
export function rowToGoal(row: { puuid: string; champion_id: number; role: string; metric: string; target: number | string; set_at: string }): Goal | null // validates role/metric
// useGoals.ts
export function useGoals(account: LinkedAccount | null): { goals: Goal[]; save: (g: Omit<Goal, 'setAt' | 'puuid'>) => Promise<void>; saving: boolean }   // query key matchKeys.goals(puuid); invalidate on save
// champions.ts
export type ChampionEntry = { id: number; name: string; imageKey: string }
export function parseChampionJson(json: unknown): ChampionEntry[]                                                   // from DDragon data map; sorted by name
export function championIdByName(list: ChampionEntry[], liveName: string): number | null                           // match by championImageKey(liveName) === imageKey, else by lower-cased name
export function championJsonUrl(version: string): string                                                           // https://ddragon.leagueoflegends.com/cdn/{v}/data/en_US/champion.json
// useChampionList.ts
export function useChampionList(): { champions: ChampionEntry[]; byName: (liveName: string) => number | null }     // staleTime 1 day, uses useDdragonVersion
// backfill.ts
export const BACKFILL_COUNT = 100
export const CHUNK = 20
export function nextChunk(ids: string[], cached: ReadonlySet<string>, size = CHUNK): string[]                      // first `size` ids not cached, in list order
// useOwnHistory.ts
export function useOwnHistory(account: LinkedAccount | null, paused: boolean): { summaries: MatchSummary[]; ids: string[]; loaded: number; total: number; running: boolean; start: () => void; error: unknown | null }
  // ids: fetchMatchIds count 100 (key matchKeys.ownIds(puuid), staleTime 10 min); details via queryClient.fetchQuery(matchDetailQuery(id, region)) chunk by chunk while running && !paused; summaries from every cached detail (queryClient.getQueryData)
// prematch-selection.ts
export async function loadSelection(): Promise<{ championId: number; role: Role } | null>; export async function saveSelection(sel): Promise<void>   // AsyncStorage key 'lpp.prematch.selection'
```

- [ ] **Step 1: Failing tests** — `parseChampionJson` (fixture with Aatrox, Nunu, MonkeyKing, Chogath → ids/keys), `championIdByName('Nunu & Willump') → Nunu id`, `('Wukong') → MonkeyKing id`, `("Cho'Gath")`, unknown → null (Review Focus 3); `nextChunk` skips cached ids and keeps order, returns [] when done (Review Focus 4); `rowToGoal` rejects a bad metric; `matchKeys.goals('p1')` shape.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the libs and hooks; `npx expo install @react-native-async-storage/async-storage`.
- [ ] **Step 4: Run** `pnpm -F @lpp/mobile test && pnpm -r typecheck && pnpm -r lint` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(mobile): goals store, champion list, chunked own-history backfill"`

---

### Task 4: Pre-match block in the Live tab

**Files:**
- Create: `apps/mobile/src/components/prematch/PrepareCard.tsx`, `RoleChips.tsx`, `ChampionPicker.tsx` (modal with search, "Your champions" first with game counts), `ChampionSummaryCard.tsx`, `MatchupsTable.tsx`, `GoalEditor.tsx` (metric segmented control, stepper, "Save goal", source line), `BackfillBar.tsx` (button + progress)
- Modify: `apps/mobile/src/app/(app)/(tabs)/live.tsx` (render `PrepareCard` under the waiting card when `state === 'waiting' || !snapshot`), `apps/mobile/src/lib/area-ui.ts` only if a colour helper is needed
- Test: `apps/mobile/tests/goal-editor.test.ts` for a pure `stepTarget(metric, target, dir)` helper exported from `GoalEditor.tsx` → move it to `apps/mobile/src/lib/goal-steps.ts`

- [ ] **Step 1: Failing test** — `stepTarget('csPerMin', 7, +1) === 7.1`, `('kpPct', 55, -1) === 54`, clamps at 0, `('visionPerMin', 0.6, +1) === 0.65`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** helper + components + screen wiring (selection persisted with `prematch-selection.ts`; `paused` for the backfill = false here). **Step 4: Run** mobile tests + typecheck + lint — PASS.
- [ ] **Step 5: Look at it** — restart Metro only if the owner's Metro is not running; otherwise relaunch Expo Go (`xcrun simctl openurl booted exp://10.0.0.127:8081`); Live tab with League closed shows the block; pick a champion (synthetic taps only after `osascript -e 'tell application "Simulator" to activate'` and after confirming no other window covers the simulator); screenshot `docs/screenshots/phase5-prematch.png`.
- [ ] **Step 6: Commit** — `git commit -m "feat(mobile): pre-match preparation block — champion/role, own history, matchups, ban hint, goal editor"`

---

### Task 5: Goal in Live and in Match Review

**Files:**
- Modify: `apps/mobile/src/components/LiveHero.tsx` (props `goal?: { text: string; status: 'on_track' | 'below' | 'unknown' } | null` replacing the `snapshot.focus` line), `apps/mobile/src/app/(app)/(tabs)/live.tsx` (resolve the goal: `goalFor(goals, account.puuid, byName(snapshot.me.championName), snapshot.me.position)` + `goalStatus(goal, liveMetrics(snapshot)[metric])`), `apps/mobile/src/components/AreaCard.tsx` (optional `goalLine?: { text: string; met: boolean | null }` rendered under the sentence), `apps/mobile/src/app/(app)/(tabs)/matches/[matchId].tsx` (goal lookup with `beforeMs = gameCreation + duration`; value from `metricsOf(summary.me, …)`; attach to the area owning the metric: csPerMin → farming, visionPerMin → vision, deathsPer10/kpPct → combat)
- Test: `apps/mobile/tests/goal-line.test.ts` for a pure `goalLine(goal, value)` in `apps/mobile/src/lib/goal-line.ts` → `{ text: 'Your goal: 7.0 CS/min → you did 6.2 (missed)', met: false }`, `(met)`, value null → `'Your goal: … → not measurable this game'`, met null.

- [ ] **Step 1: Failing test** for `goalLine`. **Step 2: Run** — FAIL. **Step 3: Implement**. **Step 4: Run** all checks — PASS.
- [ ] **Step 5: Look at it** — Live with the DEMO feed only if League is closed (`LPP_LIVE_DEMO=1`, restart the desktop in real mode afterwards): the hero shows "Personal goal: 7.0 CS/min · On track/Below goal"; a review of a game played after a goal was saved shows the goal line. Screenshot `docs/screenshots/phase5-live-goal.png`.
- [ ] **Step 6: Commit** — `git commit -m "feat(mobile): personal goal on the live hero and in match review"`

---

### Task 6: Phase 5 acceptance

- [ ] **Step 1:** Owner: picks their main champion + role, sees the summary and matchups, saves a goal, plays a game with the collector open, sees the goal live, opens the review and sees the goal line. Record in `DEVELOPMENT_PROGRESS.md` (Phase 5 section, checkbox).
- [ ] **Step 2:** Riot budget check in the Supabase function logs: one `match-list-ids(100)` call and only uncached `match-detail` calls during the backfill; zero on the second open.
- [ ] **Step 3:** `pnpm -r lint && pnpm -r typecheck && pnpm -r test`; ledger; secret scan; commit `docs: phase 5 progress report`; push `phase-5-prematch`; final review (superpowers:requesting-code-review) on `main..phase-5-prematch`.
