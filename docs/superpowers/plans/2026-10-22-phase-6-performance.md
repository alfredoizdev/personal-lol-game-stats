# Phase 6 — Performance Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fourth tab, Performance, that answers from the player's own cached games: how am I doing, which role is my strongest and weakest, which area holds me back, which champions I win with, and which lane opponents beat me.

**Architecture:** A pure engine in `packages/shared/src/performance/` turns `MatchSummary[]` into a `PerformanceProfile` (overview, roles, areas, champions, matchups, headline) using the existing `analyzeMatch` per game (no timeline, no baseline) so the scores match the Matches rows. The mobile tab reuses `useOwnHistory` + `BackfillBar` for data (no new Riot calls) and renders five cards with the existing bars, donut, portraits and role icons.

**Tech Stack:** TypeScript, Vitest, Expo SDK 58 + Expo Router, TanStack Query, react-native-svg.

**Spec:** `docs/superpowers/specs/2026-10-22-phase-6-performance-design.md`. General design: `2026-10-21-lol-personal-performance-v2-design.md` sections 10/11b (no tactical advice).

## Global Constraints

- Analyzable games only (`ANALYZABLE_QUEUES`, no remakes), newest first, then `slice(0, period)`; periods `20 | 50 | 100`, default 20.
- Game score = `analyzeMatch({ summary, series: null, baseline: null }).overall` (same as `quickRating`).
- "few games" under 3 (`FEW_GAMES` from `prematch/history`); rankings (strongest/weakest role, weakest area) only among entries with ≥ 3 games.
- Areas aggregated: `farming | combat | vision` only; `lane` never (needs the timeline). Sub-row averages over games where the sub-row is scored; target = mean of per-game targets.
- Matchups: group by `(opponent.championId, me.role)` where `opponent.role === me.role`; need ≥ 2 games; toughest = win rate asc, games desc, name (5); best = win rate desc, games desc, name (3).
- Copy is descriptive, never advice. UI in English. No new Riot calls, no new Edge Functions, no desktop changes.
- `pnpm -r typecheck && pnpm -r lint && pnpm -r test` green per task; one commit per task ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; secret scan before push.

## Review Focus

1. A support-only player: Farming must not appear in Areas and the weakest area is picked among Combat/Vision (Task 1 test).
2. One role with ≥ 3 games and others with 1–2: strongest is that role and weakest is null; never a 2-game role ranked (Task 1 test).
3. Period larger than the loaded games (Last 50 with 23 loaded): the profile uses 23 and the cards say so (Task 1 test + Task 2 period label).
4. Streak of 1 game: no streak line; a 10-game loss streak in a 10-game period: streak 10 (Task 1 test).
5. Switching Riot accounts: the tab recomputes from the new account's ids (uses `useOwnHistory(account)` keyed by puuid; existing behaviour, verified in Task 5 on device).

---

### Task 1: Performance engine (shared)

**Files:**
- Create: `packages/shared/src/performance/profile.ts`, `packages/shared/src/performance/index.ts`
- Modify: `packages/shared/src/index.ts` (export `./performance`), `docs/ANALYSIS.md` (new section 8 "Performance page aggregates")
- Test: `packages/shared/tests/performance-profile.test.ts` (fixtures from `tests/analysis-fixtures.ts`)

**Interfaces:**
- Consumes: `MatchSummary`, `Role`, `analyzeMatch`, `AreaKey`, `Rating`, `rating`, `performanceTier`, `PerformanceTier`, `ANALYZABLE_QUEUES`, `FEW_GAMES`.
- Produces:
  ```ts
  export const PERIODS = [20, 50, 100] as const
  export type Period = (typeof PERIODS)[number]
  export const ROLE_LABEL: Record<Role, string> // Top, Jungle, Mid, Bot, Support
  export const RECENT_N = 10
  export type RoleStat = { role: Role; games: number; wins: number; winRate: number; avgScore: number | null; fewGames: boolean }
  export type AreaSubrowStat = { key: string; label: string; avg: number | null; target: number | null; decimals: number; suffix: string; n: number }
  export type AreaStat = { key: AreaKey; label: string; avgScore: number | null; rating: Rating | null; n: number; subrows: AreaSubrowStat[] }
  export type ChampionStat = { championId: number; championName: string; role: Role | null; games: number; wins: number; winRate: number; avgScore: number | null; tier: PerformanceTier | null; fewGames: boolean }
  export type MatchupStat = { championId: number; championName: string; role: Role; games: number; wins: number; winRate: number; fewGames: boolean }
  export type RecentGame = { matchId: string; win: boolean; score: number | null; championName: string }
  export type Streak = { kind: 'win' | 'loss'; n: number } | null
  export type PerformanceProfile = {
    period: Period; games: number; wins: number; winRate: number | null
    avgScore: number | null; tier: PerformanceTier | null
    recent: RecentGame[]          // oldest → newest, at most RECENT_N
    streak: Streak                // n ≥ 2 only
    roles: RoleStat[]             // games desc, then role order TOP…UTILITY
    strongestRole: Role | null; weakestRole: Role | null
    areas: AreaStat[]             // farming (if scored in ≥ 1 game), combat, vision
    weakestArea: AreaKey | null
    champions: ChampionStat[]     // games desc, winRate desc, name; ≤ 8
    toughest: MatchupStat[]; best: MatchupStat[]
    headline: string
  }
  export function performanceProfile(all: MatchSummary[], period: Period): PerformanceProfile
  ```
- Headline: 0 games → `No Summoner's Rift games loaded yet.`; < 3 → `Only ${n} game${n === 1 ? '' : 's'} loaded — load more for a clearer picture.`; else join with ` · `: `${winRate}% win rate over ${games} games`, `strongest as ${ROLE_LABEL[strongestRole]}` (if any), `${areaLabel} is your weakest area` (if any).

- [ ] **Step 1: Write the failing tests** (`performance-profile.test.ts`): empty → zeros/nulls and the 0-games headline; ARAM/remake excluded; period slices newest first and reports `games` = loaded when fewer; overview avgScore = mean of game scores and tier; recent oldest→newest capped at 10; streak null for 1, `{loss, 3}` for three newest losses; roles sorted and strongest/weakest with the ≥ 3 rule (one eligible role → weakest null); areas: support-only has no farming, weakest among combat/vision; subrow avg + mean target; champions top by games with most-played role and tier; matchups toughest/best with the ≥ 2 rule and the tie-break; headline joins parts.
- [ ] **Step 2: Run** `pnpm -F @lpp/shared test -- performance-profile` → FAIL (module not found).
- [ ] **Step 3: Implement** `profile.ts` and `index.ts`; export from `src/index.ts`.
- [ ] **Step 4: Run** `pnpm -F @lpp/shared test` → PASS, typecheck + lint green.
- [ ] **Step 5: Document** the aggregates in `docs/ANALYSIS.md` section 8 (what is averaged, the ≥ 3 / ≥ 2 rules, lane excluded, target = mean of per-game targets).
- [ ] **Step 6: Commit** `feat(shared): performance profile engine (roles, areas, champions, matchups)`.

### Task 2: Performance tab plumbing + period/overview

**Files:**
- Create: `apps/mobile/src/app/(app)/(tabs)/performance.tsx`, `apps/mobile/src/lib/performance-ui.ts`, `apps/mobile/src/components/performance/PeriodChips.tsx`, `apps/mobile/src/components/performance/OverviewCard.tsx`, `apps/mobile/src/components/performance/RecentStrip.tsx`
- Modify: `apps/mobile/src/lib/tab-bar.ts` (`TabName` += `'performance'`, `activeTabFor`), `apps/mobile/src/components/TabBar.tsx` (icon `stats-chart-outline`), `apps/mobile/src/app/(app)/(tabs)/_layout.tsx` (screen between live and profile), `apps/mobile/src/components/prematch/RoleChips.tsx` (import `ROLE_LABEL` from shared, keep the export)
- Test: `apps/mobile/tests/tab-bar.test.ts` (performance route highlights performance), `apps/mobile/tests/performance-ui.test.ts`

**Interfaces:**
- Consumes: `performanceProfile`, `PERIODS`, `Period`, `PerformanceProfile`, `Streak`, `useOwnHistory`, `BackfillBar`, `SemiDonut`, `tierColor`, `TIER_LABELS`.
- Produces (`performance-ui.ts`):
  ```ts
  export function periodLabel(p: Period): string                       // 'Last 20' | 'Last 50' | 'All loaded'
  export function recordLabel(p: PerformanceProfile): string           // '12W – 8L · 60% win rate' | 'No games yet'
  export function streakLabel(s: Streak): string | null                // '3-game loss streak' | null
  export function gamesNote(p: PerformanceProfile): string             // 'Over your last 20 games' | 'Over your 7 loaded games' (when games < period)
  export function barHeight(score: number | null, max: number): number // 0 for null, else max·score/100 with a 2 px floor
  ```
- [ ] **Step 1: Failing tests** for `tab-bar` (performance) and `performance-ui` (all five helpers, including the 1-game record and the null streak).
- [ ] **Step 2: Run** `pnpm -F @lpp/mobile test -- tab-bar performance-ui` → FAIL.
- [ ] **Step 3: Implement** helpers, tab plumbing, `performance.tsx` (Screen title "Performance", subtitle Riot ID; `useOwnHistory(account, false)`; `BackfillBar`; `PeriodChips`; `OverviewCard` with `SemiDonut`, kicker `${tier} · ${TIER_LABELS[tier]}`, headline, record, streak, `RecentStrip`; empty-state card when `games === 0`).
- [ ] **Step 4: Run** mobile test/typecheck/lint → PASS.
- [ ] **Step 5: Commit** `feat(mobile): Performance tab with period chips and overview`.

### Task 3: Roles and Areas cards

**Files:**
- Create: `apps/mobile/src/components/performance/RolesCard.tsx`, `apps/mobile/src/components/performance/AreasCard.tsx`
- Modify: `apps/mobile/src/lib/performance-ui.ts`, `apps/mobile/src/app/(app)/(tabs)/performance.tsx`
- Test: `apps/mobile/tests/performance-ui.test.ts`

**Interfaces:**
- Produces (`performance-ui.ts`):
  ```ts
  export function roleRankNote(p: PerformanceProfile): string   // 'Strongest: Mid · Weakest: Top' | 'Strongest: Mid' | 'Play 3 games in a role to rank it.'
  export function subrowLine(s: AreaSubrowStat): string         // 'CS / min 6.4 · target 7.0' ; '—' when avg null; '%' suffix kept
  ```
- [ ] **Step 1: Failing tests** for `roleRankNote` (three cases) and `subrowLine` (decimals, suffix, null).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** helpers + `RolesCard` (RoleIcon, label, `n games · w% win`, score bar with `ratingColor(rating(avgScore))`, "few games" tag, footer note) + `AreasCard` (per area: label, score, rating word, bar; subrow lines; note "Lane is scored in each Match Review (needs the timeline). Targets are the average role target over these games."). Mount both in `performance.tsx`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(mobile): roles and areas cards on Performance`.

### Task 4: Champions and Lane matchups cards

**Files:**
- Create: `apps/mobile/src/components/performance/ChampionsCard.tsx`, `apps/mobile/src/components/performance/MatchupsCard.tsx`
- Modify: `apps/mobile/src/app/(app)/(tabs)/performance.tsx`
- Test: `apps/mobile/tests/performance-ui.test.ts` (`winRateColor`)

**Interfaces:**
- Produces: `export function winRateColor(winRate: number): string // ≥ 50 win, else loss`.
- [ ] **Step 1: Failing test** for `winRateColor`. **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `ChampionsCard` (ChampionPortrait with ring by win rate, DDragon display name via `useChampionList`, RoleIcon, `n games`, win rate, tier badge `7+` coloured by `tierColor`) and `MatchupsCard` (two lists "You lose to" / "You beat" with portrait, name, RoleIcon, `W – L`, win rate + track bar; empty copy "No lane opponent faced twice yet."). Mount in `performance.tsx`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(mobile): champions and lane matchups on Performance`.

### Task 5: Acceptance

- [ ] **Step 1:** `pnpm -r typecheck && pnpm -r lint && pnpm -r test` → all green (record counts).
- [ ] **Step 2:** Simulator check of the tab with the owner's account (temporary redirect hack, reverted): screenshot `docs/screenshots/phase6-performance.png`; fix anything visibly wrong.
- [ ] **Step 3:** `DEVELOPMENT_PROGRESS.md`: Phase 6 = Performance page (checked), Phase 7 = Riot submission package (unchecked). Commit `docs: phase 6 performance page`.
- [ ] **Step 4:** Secret scan on the branch, push, final review package.
