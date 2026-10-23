# Phase 3 — Match Analysis (Explainable Area Scores) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match Review turns raw numbers into four scored, explained areas (Farming, Combat, Vision, Lane): a semi-donut 0–100 with a rating word, sub-rows with bars and "vs opponent" / "vs you" deltas, a one-line sentence with the concrete number, and a CS-per-minute curve against the lane opponent built from the Riot timeline.

**Architecture:** A pure analysis engine lives in `packages/shared/src/analysis/` (targets table → ratio/diff curves → per-area weighted means → sentences) and is unit-tested against the spec's mandatory cases. A new Edge Function `match-timeline` (copy of the `match-detail` pattern) caches the full Riot timeline in `match_timeline_cache` and returns a ~10 KB per-minute series to the phone. The phone adds two hooks (`useMatchTimeline`, `useBaseline`) and a redesigned Match Review screen (overall score, area pills, area card with chart, collapsed Lane Matchup, "How it's scored" route).

**Tech Stack:** TypeScript, Vitest, Expo SDK 58 + Expo Router (nested stack under the Matches tab), TanStack Query, `react-native-svg`, Supabase Edge Functions (Deno) + Postgres migration, Supabase CLI from the RiftLens repo.

**Spec:** `docs/superpowers/specs/2026-10-22-phase-3-analysis-design.md` (all sections; section 6 holds the builder-check decisions). General design: `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md` sections 3 (Riot policy, Supabase source copied to RiftLens), 6.4 (`match_timeline_cache`), 10 (exclusions).

## Global Constraints

- Scores come **only** from the fixed per-role targets table; "vs opponent" and "vs you" deltas are context and never move a score (spec 2.2).
- Ratio curve: `value/target` 0.5 → 0, 1.0 → 70, 1.3 → 100, linear between, clamped. Lower-is-better metrics invert the ratio (`target/value`). Lane diff curves: CS −40 → 0, 0 → 60, +25 → 100; gold −1500 → 0, 0 → 60, +1500 → 100; XP −1000 → 0, 0 → 60, +1000 → 100 (spec 2.2).
- Rating words: `Poor` < 40, `Fair` 40–59, `Good` 60–79, `Great` ≥ 80 (spec 2.1).
- Area weights: UTILITY → Vision 40, Combat 30, Lane 30 (Farming not scored); other roles → Farming 35, Combat 30, Lane 20, Vision 15. Sub-row weights: Combat KP 50 / deaths-per-10 50; Vision vision-score/min 60 / wards/min 40; Farming total 40 / lane 20 / mid 20 / late 20 (no timeline → total 100); Lane equal weights across its sub-rows. Missing (`null`) sub-rows and areas renormalize the remaining weights (spec 6.1).
- Phases: lane 0–14 min, mid 14–25 min, late 25 min–end. A phase counts only if the game lasts at least 2 minutes into it (spec 2.1, 4).
- Lane sub-rows by role: UTILITY gold + XP diff only; JUNGLE and others CS + gold + XP diff, at 10 and 15 min, against the enemy with the same `teamPosition` (spec 6.4). No opponent → Lane area hidden with a reason.
- Analyzable queues: `400, 420, 430, 440, 480, 490, 700`. Remakes, bots, ARAM, Arena: no areas, hero + Lane Matchup only, with the reason shown (spec 6.5).
- Baseline "vs you": last 20 analyzable same-role games, excluding remakes and the open match; `n` shown; `n < 3` → "few games" label; the review fetches missing details in the background (spec 6.2).
- Riot budget per first open of a review: 1 `match-timeline` + up to 10 `match-detail`; reopening costs 0 (both caches are forever).
- Sentences: template text with the concrete number and its reference; never tactical advice, never win probability (spec 2.3, 3).
- Chart colors: you `#0E9DB5`, enemy `#E8486F` (validated in Phase 4); text never in series colors; a legend for two series; 2 px lines; ≥ 8 px markers.
- Expo Router 58: no `href: null` tab screens for navigable routes (Phase 4 gotcha). New screens go in the Matches tab stack.
- Supabase source (`supabase/functions/match-timeline`, `supabase/migrations/*match_timeline_cache.sql`) lives in this repo and is copied verbatim to `~/Desktop/lol-app-ui/desktop-app/supabase/` in the same task; deploys run from the RiftLens repo and the exact command is shown to the owner before running (spec 6.3).
- No secrets in the repo; secret scan (`eyJhbGci`, `RGAPI-`, `service_role` keys) before every push. UI copy in English.
- `pnpm -r typecheck && pnpm -r lint && pnpm -r test` green at the end of every task; one commit per task ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. A 9-minute remake-length game that is **not** flagged a remake (e.g. 6-minute surrender in a bot game is excluded anyway, but a 9:30 early surrender in ranked): Lane @10/@15 sub-rows are `null`, mid/late phases absent, and the area still renders without `NaN`. Test in Task 2 (`phaseCs` returns null) and Task 3 (`analyzeMatch` renormalizes).
2. The player's `teamKills` is 0 (team got no kills): KP sub-row is `null`, Combat scores on deaths only, the sentence never says "0% kill participation". Test in Task 3.
3. Timeline frames whose `participantFrames` lack the opponent (Riot returns 10 frames but a participant id outside 1–10, or a corrupt frame): `laneDiffAt` returns `null`, not a crash. Test in Task 2.
4. The baseline window contains the open match and a remake: both are excluded and `n` reflects it; with `n` of 0, 1 or 2 the "vs you" delta is hidden/labelled "few games" and nothing divides by zero. Test in Task 3.
5. `match-timeline` returns `RATE_LIMITED` while the detail already rendered: the review shows the areas that do not need the timeline (Combat, Vision, Farming total) and a retry on the Farming/Lane cards instead of blanking the screen. Test in Task 6 (`analysisInputFromQueries` helper).

---

### Task 1: Targets, curves and richer match summaries (shared)

**Files:**
- Create: `packages/shared/src/analysis/targets.ts`, `packages/shared/src/analysis/score.ts`, `packages/shared/src/analysis/index.ts`
- Modify: `packages/shared/src/match-v5.ts` (add fields), `packages/shared/src/index.ts` (export `./analysis`)
- Test: `packages/shared/tests/analysis-score.test.ts`, `packages/shared/tests/match-summary.test.ts` (extend)

**Interfaces:**
- Consumes: `Role`, `MatchV5Participant`, `PlayerLine`, `MatchSummary`, `summarizeMatch` from `match-v5.ts`.
- Produces:
  ```ts
  // match-v5.ts additions
  type MatchV5Participant = { …existing; participantId: number; wardsKilled?: number }
  type PlayerLine = { …existing; participantId: number; wardsPlaced: number; wardsKilled: number }
  type MatchSummary = { …existing; teamKills: number } // kills of the player's team
  // targets.ts
  export const ANALYZABLE_QUEUES: ReadonlySet<number>            // 400, 420, 430, 440, 480, 490, 700
  export type ScoredRole = Role
  export type RoleTargets = { csPerMin: number | null; visionPerMin: number; wardsPerMin: number; deathsPer10Max: number; kpPct: number }
  export const ROLE_TARGETS: Record<Role, RoleTargets>           // values from spec 2.2 (UTILITY csPerMin null)
  export type AreaKey = 'farming' | 'combat' | 'vision' | 'lane'
  export const AREA_WEIGHTS: Record<Role, Partial<Record<AreaKey, number>>>
  export const SUBROW_WEIGHTS: { farming: { total: 40; lane: 20; mid: 20; late: 20 }; combat: { kp: 50; deaths: 50 }; vision: { visionPerMin: 60; wardsPerMin: 40 } }
  export const PHASES: ReadonlyArray<{ key: 'lane' | 'mid' | 'late'; label: string; startSec: number; endSec: number | null }> // 0–840, 840–1500, 1500–null
  export const PHASE_MIN_SEC = 120
  export const DIFF_CURVES: { cs: { floor: -40; mid: 0; ceil: 25 }; gold: { floor: -1500; mid: 0; ceil: 1500 }; xp: { floor: -1000; mid: 0; ceil: 1000 } }
  // score.ts
  export type Rating = 'Poor' | 'Fair' | 'Good' | 'Great'
  export function scoreRatio(value: number | null, target: number | null, mode: 'higher' | 'lower'): number | null  // 0–100 integer or null
  export function scoreDiff(diff: number | null, curve: { floor: number; mid: number; ceil: number }): number | null
  export function rating(score: number): Rating
  export function weightedMean(entries: Array<{ score: number | null; weight: number }>): number | null // null when every score is null; renormalizes
  ```

- [ ] **Step 1: Write the failing tests for the curves and the table**

```ts
// packages/shared/tests/analysis-score.test.ts
import { describe, it, expect } from 'vitest'
import { scoreRatio, scoreDiff, rating, weightedMean } from '../src/analysis/score'
import { ROLE_TARGETS, AREA_WEIGHTS, ANALYZABLE_QUEUES, DIFF_CURVES } from '../src/analysis/targets'

describe('scoreRatio', () => {
  it('maps 0.5 → 0, 1.0 → 70, 1.3 → 100 and clamps', () => {
    expect(scoreRatio(3.5, 7, 'higher')).toBe(0)
    expect(scoreRatio(7, 7, 'higher')).toBe(70)
    expect(scoreRatio(9.1, 7, 'higher')).toBe(100)
    expect(scoreRatio(12, 7, 'higher')).toBe(100)
    expect(scoreRatio(5.25, 7, 'higher')).toBe(35)
  })
  it('inverts lower-is-better metrics and treats 0 as perfect', () => {
    expect(scoreRatio(1.5, 1.5, 'lower')).toBe(70)
    expect(scoreRatio(3, 1.5, 'lower')).toBe(0)
    expect(scoreRatio(0, 1.5, 'lower')).toBe(100)
  })
  it('returns null without a value or a target', () => {
    expect(scoreRatio(null, 7, 'higher')).toBeNull()
    expect(scoreRatio(5, null, 'higher')).toBeNull()
  })
})

describe('scoreDiff', () => {
  it('maps the CS curve −40 → 0, 0 → 60, +25 → 100', () => {
    expect(scoreDiff(-40, DIFF_CURVES.cs)).toBe(0)
    expect(scoreDiff(-60, DIFF_CURVES.cs)).toBe(0)
    expect(scoreDiff(0, DIFF_CURVES.cs)).toBe(60)
    expect(scoreDiff(-20, DIFF_CURVES.cs)).toBe(30)
    expect(scoreDiff(25, DIFF_CURVES.cs)).toBe(100)
    expect(scoreDiff(null, DIFF_CURVES.cs)).toBeNull()
  })
})

describe('rating', () => {
  it('uses the spec thresholds', () => {
    expect(rating(39)).toBe('Poor'); expect(rating(40)).toBe('Fair'); expect(rating(60)).toBe('Good'); expect(rating(80)).toBe('Great')
  })
})

describe('weightedMean', () => {
  it('renormalizes around null scores and returns null when all are null', () => {
    expect(weightedMean([{ score: 80, weight: 40 }, { score: null, weight: 60 }])).toBe(80)
    expect(weightedMean([{ score: 80, weight: 50 }, { score: 40, weight: 50 }])).toBe(60)
    expect(weightedMean([{ score: null, weight: 1 }])).toBeNull()
  })
})

describe('targets table', () => {
  it('holds the spec values', () => {
    expect(ROLE_TARGETS.BOTTOM.csPerMin).toBe(7.5)
    expect(ROLE_TARGETS.UTILITY.csPerMin).toBeNull()
    expect(ROLE_TARGETS.UTILITY.visionPerMin).toBe(2.0)
    expect(AREA_WEIGHTS.UTILITY).toEqual({ vision: 40, combat: 30, lane: 30 })
    expect(AREA_WEIGHTS.MIDDLE).toEqual({ farming: 35, combat: 30, lane: 20, vision: 15 })
    expect([...ANALYZABLE_QUEUES].sort()).toEqual([400, 420, 430, 440, 480, 490, 700])
  })
})
```

- [ ] **Step 2: Extend the match summary test for the new fields**

Add to `packages/shared/tests/match-summary.test.ts`: a participant fixture with `participantId: 1`, `wardsPlaced: 9`, `wardsKilled: 2`; assert `summary.me.participantId === 1`, `summary.me.wardsPlaced === 9`, `summary.me.wardsKilled === 2`, and `summary.teamKills` equals the sum of kills of the player's `teamId`. Missing `wardsPlaced`/`wardsKilled` default to 0; a missing `participantId` falls back to the 1-based index in `info.participants`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm -F @lpp/shared exec vitest run tests/analysis-score.test.ts tests/match-summary.test.ts`
Expected: FAIL (module `../src/analysis/score` not found; new fields undefined).

- [ ] **Step 4: Implement `targets.ts`, `score.ts` and the `match-v5.ts` additions**

`scoreRatio` rounds to an integer. `weightedMean` returns an integer. Export the analysis module from `packages/shared/src/analysis/index.ts` and add `export * from './analysis'` to `packages/shared/src/index.ts`.

- [ ] **Step 5: Run the shared suite and the monorepo checks**

Run: `pnpm -F @lpp/shared test && pnpm -r typecheck && pnpm -r lint`
Expected: all PASS (desktop/mobile untouched; the new `PlayerLine` fields have defaults so fixtures compile).

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat(analysis): role targets, score curves, richer match summaries"
```

---

### Task 2: Timeline series math (shared)

**Files:**
- Create: `packages/shared/src/analysis/timeline-series.ts`
- Test: `packages/shared/tests/timeline-series.test.ts`

**Interfaces:**
- Consumes: `PHASES`, `PHASE_MIN_SEC` from Task 1.
- Produces (this type is also the Edge Function's response contract in Task 4):
  ```ts
  export type TimelineSeries = {
    v: 1
    matchId: string
    /** participantId (1–10) → puuid */
    participants: Array<{ participantId: number; puuid: string }>
    /** One entry per Riot frame, in order. Arrays are indexed by participantId − 1 (length 10). cs = minionsKilled + jungleMinionsKilled. */
    frames: Array<{ t: number; cs: number[]; gold: number[]; xp: number[] }>
  }
  export type PhaseKey = 'lane' | 'mid' | 'late'
  export type PhaseStat = { key: PhaseKey; label: string; startSec: number; endSec: number; csPerMin: number | null }
  /** CS/min of one participant inside a phase; null when the phase did not happen (game too short) or frames are missing. */
  export function phaseCs(series: TimelineSeries, participantId: number, phase: PhaseKey, durationSec: number): number | null
  export function phaseStats(series: TimelineSeries, participantId: number, durationSec: number): PhaseStat[]
  /** me − opponent at a given minute; null if either frame/participant is missing or the game is shorter. */
  export function laneDiffAt(series: TimelineSeries, me: number, opponent: number, minute: 10 | 15, metric: 'cs' | 'gold' | 'xp'): number | null
  /** Cumulative CS per frame for the chart: [{ t, me, enemy }] with nulls where a participant is missing. */
  export function csCurve(series: TimelineSeries, me: number, opponent: number | null): Array<{ t: number; me: number | null; enemy: number | null }>
  export function goldDiffCurve(series: TimelineSeries, me: number, opponent: number): Array<{ t: number; diff: number | null }>
  /** Frame nearest to (and not after) a time, or null. */
  export function frameAt(series: TimelineSeries, tSec: number): TimelineSeries['frames'][number] | null
  ```

- [ ] **Step 1: Write the failing tests**

Build a fixture helper `series(frames: Array<[t, csMe, csOpp]>)` with 10 participants (me = 1, opponent = 6) and gold/xp derived (`gold = cs * 20`, `xp = cs * 30`).

```ts
describe('phaseCs', () => {
  it('lane phase CS/min from the frame at 14 min minus the frame at 0', () => {
    const s = series([[0, 0, 0], [600, 80, 70], [840, 115, 100], [1500, 190, 180], [1800, 230, 210]])
    expect(phaseCs(s, 1, 'lane', 1800)).toBeCloseTo(115 / 14, 2)
    expect(phaseCs(s, 1, 'mid', 1800)).toBeCloseTo((190 - 115) / 11, 2)
    expect(phaseCs(s, 1, 'late', 1800)).toBeCloseTo((230 - 190) / 5, 2)
  })
  it('a 9-minute game has only the lane phase', () => {
    const s = series([[0, 0, 0], [540, 60, 55]])
    expect(phaseCs(s, 1, 'lane', 540)).toBeCloseTo(60 / 9, 2)
    expect(phaseCs(s, 1, 'mid', 540)).toBeNull()
    expect(phaseStats(s, 1, 540).map((p) => p.csPerMin)).toEqual([expect.any(Number), null, null])
  })
  it('late phase needs at least 2 minutes', () => {
    const s = series([[0, 0, 0], [1500, 190, 180], [1560, 195, 185]])
    expect(phaseCs(s, 1, 'late', 1560)).toBeNull()
  })
})

describe('laneDiffAt', () => {
  it('me − opponent at 10 and 15 minutes', () => {
    const s = series([[0, 0, 0], [600, 80, 70], [900, 120, 125]])
    expect(laneDiffAt(s, 1, 6, 10, 'cs')).toBe(10)
    expect(laneDiffAt(s, 1, 6, 15, 'cs')).toBe(-5)
    expect(laneDiffAt(s, 1, 6, 15, 'gold')).toBe(-100)
  })
  it('null when the game is shorter than the minute or a participant is missing', () => {
    const s = series([[0, 0, 0], [600, 80, 70]])
    expect(laneDiffAt(s, 1, 6, 15, 'cs')).toBeNull()
    expect(laneDiffAt(s, 1, 11, 10, 'cs')).toBeNull()
    const corrupt = { ...s, frames: s.frames.map((f) => ({ ...f, cs: f.cs.slice(0, 3) })) }
    expect(laneDiffAt(corrupt, 1, 6, 10, 'cs')).toBeNull()
  })
})

describe('csCurve / goldDiffCurve', () => {
  it('one point per frame, enemy null without an opponent', () => {
    const s = series([[0, 0, 0], [60, 8, 7]])
    expect(csCurve(s, 1, 6)).toEqual([{ t: 0, me: 0, enemy: 0 }, { t: 60, me: 8, enemy: 7 }])
    expect(csCurve(s, 1, null)[1]).toEqual({ t: 60, me: 8, enemy: null })
    expect(goldDiffCurve(s, 1, 6)[1]).toEqual({ t: 60, diff: 20 })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm -F @lpp/shared exec vitest run tests/timeline-series.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement `timeline-series.ts`**

`frameAt(series, t)` picks the last frame with `frame.t <= t`. A phase "happened" when `durationSec >= startSec + PHASE_MIN_SEC`; its end is `min(endSec ?? durationSec, durationSec)`; CS/min = `(cs(endFrame) − cs(startFrame)) / ((end − start) / 60)`. Any missing array index → `null`. Export from `analysis/index.ts`.

- [ ] **Step 4: Run tests** — `pnpm -F @lpp/shared test` Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(analysis): timeline series phases, lane diffs and curves"`

---

### Task 3: Baseline, areas, sentences — `analyzeMatch` (shared) + `docs/ANALYSIS.md`

**Files:**
- Create: `packages/shared/src/analysis/baseline.ts`, `packages/shared/src/analysis/areas.ts`, `packages/shared/src/analysis/sentences.ts`, `docs/ANALYSIS.md`
- Modify: `packages/shared/src/analysis/index.ts`
- Test: `packages/shared/tests/analysis-areas.test.ts`, `packages/shared/tests/analysis-baseline.test.ts`

**Interfaces:**
- Consumes: Task 1 (`ROLE_TARGETS`, `AREA_WEIGHTS`, `SUBROW_WEIGHTS`, `DIFF_CURVES`, `scoreRatio`, `scoreDiff`, `rating`, `weightedMean`, `ANALYZABLE_QUEUES`), Task 2 (`phaseStats`, `laneDiffAt`, `TimelineSeries`), `MatchSummary`.
- Produces:
  ```ts
  // baseline.ts
  export type Baseline = { n: number; csPerMin: number | null; kpPct: number | null; deathsPer10: number | null; visionPerMin: number | null; wardsPerMin: number | null }
  export function buildBaseline(summaries: MatchSummary[], role: Role, excludeMatchId: string): Baseline   // analyzable queue, same role, no remakes, newest 20
  export const BASELINE_MIN_GAMES = 3
  // areas.ts
  export type Delta = { vsOpponent: number | null; vsYou: number | null }
  export type Subrow = { key: string; label: string; value: number | null; display: string; target: number | null; score: number | null; weight: number; delta: Delta; context: boolean /* true = shown, never scored */ }
  export type AreaResult = { key: AreaKey; label: string; score: number | null; rating: Rating | null; weight: number; subrows: Subrow[]; sentence: string; hiddenReason: string | null }
  export type MatchAnalysis =
    | { analyzable: false; reason: string }
    | { analyzable: true; overall: number | null; overallRating: Rating | null; headline: string; areas: AreaResult[]; weakest: AreaKey | null; baselineN: number; timelineMissing: boolean }
  export type AnalysisInput = { summary: MatchSummary; series: TimelineSeries | null; baseline: Baseline | null }
  export function analyzeMatch(input: AnalysisInput): MatchAnalysis
  export function metricsOf(line: PlayerLine, durationSec: number, teamKills: number): { csPerMin: number | null; kpPct: number | null; deathsPer10: number | null; visionPerMin: number | null; wardsPerMin: number | null; damagePerMin: number | null }
  // sentences.ts
  export function areaSentence(area: AreaKey, weakest: Subrow | null, role: Role): string
  export function headline(areas: AreaResult[]): string   // "What holds you back most: Vision" / "Solid all around" when all ≥ 60
  ```
- Sub-row keys: farming `total | lane | mid | late`; combat `kp | deaths | kda(context) | damagePerMin(context)`; vision `visionPerMin | wardsPerMin | wardsKilled(context)`; lane `cs | gold | xp` (each `value` = diff at 15, `display` shows "@10 / @15", scored as the mean of `scoreDiff` at 10 and 15; UTILITY omits `cs`).
- Display formats: CS/min 1 decimal, KP `%` integer, deaths per 10 min 1 decimal, vision/min 2 decimals, wards/min 2 decimals, diffs signed integers.

- [ ] **Step 1: Write the failing baseline tests**

```ts
// analysis-baseline.test.ts — fixtures via a `summary({ matchId, queueId, role, remake, csPerMin, … })` helper
it('uses the newest 20 analyzable same-role games, excluding remakes and the open match', …)   // n counts correctly
it('n = 0 when nothing qualifies and every mean is null', …)
it('kpPct ignores games whose teamKills is 0', …)
it('ARAM (450) and bot games (830) never enter the baseline', …)
```

- [ ] **Step 2: Write the failing area tests (the spec's mandatory cases)**

```ts
// analysis-areas.test.ts
it('not analyzable for ARAM, bots and remakes, with a reason', …)                       // queueId 450 / 830 / remake:true
it('a full ranked ADC game scores four areas and the overall is the weighted mean', …)  // check one hand-computed area score and overall; see docs/ANALYSIS.md example
it('UTILITY: Farming hidden, Lane has gold+xp only, weights renormalize to 40/30/30', …)
it('no timeline: Farming = total only, Lane hidden with reason, timelineMissing true', …)
it('no lane opponent: Lane hidden, deltas vsOpponent null', …)
it('teamKills 0: KP subrow null, Combat scores on deaths only, sentence does not mention KP', …)
it('9-minute game: mid/late null, Lane @15 null, nothing is NaN', …)
it('baseline with 0, 1 or 2 games: vsYou null and baselineN reported', …)
it('context subrows (kda, damagePerMin, wardsKilled) never carry a score and never drive the sentence', …)
it('the sentence names the weakest scored subrow with its number and reference', …)      // e.g. /CS\/min.*vs 7\.5 target/ or /vs your opponent/
```

- [ ] **Step 3: Run to verify failure** — `pnpm -F @lpp/shared exec vitest run tests/analysis-*.test.ts` Expected: FAIL.

- [ ] **Step 4: Implement `baseline.ts`, `areas.ts`, `sentences.ts`**

Sentence templates (English, one per sub-row key, role-aware for Lane); the reference is "vs your opponent" when `delta.vsOpponent` is not null, otherwise "vs the N target for your role". Example strings to pin in tests: `Weak late-game farming: 4.1 CS/min vs 5.8 for your opponent (25–42 min).` / `Too many deaths: 2.3 per 10 min vs 1.5 target.` / `Low vision: 0.45 vision score/min vs 0.60 target.` / `Behind in lane: −17 CS vs your opponent at 15 min.`

- [ ] **Step 5: Write `docs/ANALYSIS.md`**

Contents: the targets table, the two curves, sub-row and area weights, the renormalization rule, the baseline rule, the analyzable queues, and one worked example (the ADC fixture from Step 2) computed by hand to the same integers the test asserts.

- [ ] **Step 6: Run the shared suite and monorepo checks** — `pnpm -F @lpp/shared test && pnpm -r typecheck && pnpm -r lint` Expected: PASS.

- [ ] **Step 7: Commit** — `git add packages/shared docs/ANALYSIS.md && git commit -m "feat(analysis): analyzeMatch — areas, baseline, sentences; docs/ANALYSIS.md"`

---

### Task 4: `match-timeline` Edge Function + `match_timeline_cache` (this repo → RiftLens → deploy)

**Files:**
- Create: `supabase/functions/match-timeline/index.ts`, `supabase/migrations/20261022000001_match_timeline_cache.sql`, `supabase/README.md` (where the source of truth is and how it is copied/deployed)
- Copy to: `~/Desktop/lol-app-ui/desktop-app/supabase/functions/match-timeline/index.ts`, `~/Desktop/lol-app-ui/desktop-app/supabase/migrations/20261022000001_match_timeline_cache.sql`
- Test: `supabase/functions/match-timeline/reduce.test.ts` (Vitest, runs in the shared package config via `packages/shared/tests/timeline-reduce.test.ts` importing `supabase/functions/match-timeline/reduce.ts` — keep the reducer in a dependency-free module)

**Interfaces:**
- Consumes: the `match-detail` function pattern (`~/Desktop/lol-app-ui/desktop-app/supabase/functions/match-detail/index.ts`: CORS, `resolveApiKey`, region → cluster, error codes, cache read/upsert, no "reduced blob" logic).
- Produces: `POST { matchId, region }` → `TimelineSeries` (Task 2 type, `v: 1`) or `{ error: 'KEY_INVALID' | 'RATE_LIMITED' | 'NOT_FOUND' | 'UNKNOWN' }`. Riot endpoint: `https://{cluster}/lol/match/v5/matches/{matchId}/timeline`. Table: `match_timeline_cache (match_id text pk, region text not null, data jsonb not null, fetched_at timestamptz default now())`, RLS enabled, no client policies, `grant all … to service_role`. Reducer: `export function reduceTimeline(raw: RiotTimeline): TimelineSeries` where `raw.info.frames[i].timestamp` (ms) → `t = Math.round(ms / 1000)`, `participantFrames[pid]` → `cs = minionsKilled + jungleMinionsKilled`, `gold = totalGold`, `xp = xp`; `raw.info.participants[{participantId, puuid}]`.

- [ ] **Step 1: Write the failing reducer test**

```ts
// packages/shared/tests/timeline-reduce.test.ts
it('reduces a Riot timeline to per-frame cs/gold/xp arrays indexed by participantId − 1', () => {
  const out = reduceTimeline(rawFixture)  // 2 frames, 10 participants, timestamps 0 and 60012
  expect(out).toMatchObject({ v: 1, matchId: 'NA1_1' })
  expect(out.frames[1]!.t).toBe(60)
  expect(out.frames[1]!.cs[0]).toBe(8)      // participant 1: minionsKilled 6 + jungleMinionsKilled 2
  expect(out.frames[1]!.gold[5]).toBe(620)
  expect(out.participants[5]).toEqual({ participantId: 6, puuid: 'p6' })
})
it('fills missing participant frames with null-safe zeros and keeps array length 10', …)
```

- [ ] **Step 2: Run to verify failure** — Expected: FAIL (module not found).

- [ ] **Step 3: Implement `reduce.ts` and `index.ts`**

`index.ts`: same skeleton as `match-detail` (copy the key resolution verbatim); on cache hit return `reduceTimeline(cached.data)`; on miss fetch Riot, upsert the full blob into `match_timeline_cache` without awaiting, respond with the reduced series. Write the migration with the same comments style as `20260603000002_match_details_cache.sql`.

- [ ] **Step 4: Run the reducer test and a Deno check**

Run: `pnpm -F @lpp/shared test` Expected: PASS. Run: `cd supabase/functions/match-timeline && deno check index.ts` (if `deno` is installed; otherwise note it in the ledger and rely on the deploy's own bundling check).

- [ ] **Step 5: Copy to RiftLens and show the deploy commands to the owner before running them**

```bash
cp supabase/functions/match-timeline/index.ts ~/Desktop/lol-app-ui/desktop-app/supabase/functions/match-timeline/index.ts   # mkdir -p first
cp supabase/functions/match-timeline/reduce.ts ~/Desktop/lol-app-ui/desktop-app/supabase/functions/match-timeline/reduce.ts
cp supabase/migrations/20261022000001_match_timeline_cache.sql ~/Desktop/lol-app-ui/desktop-app/supabase/migrations/
cd ~/Desktop/lol-app-ui/desktop-app
npx supabase db push            # applies the new migration only
npx supabase functions deploy match-timeline
```
Tell the owner these exact commands in chat (spec 6.3), then run them. Expected: `db push` lists only `20261022000001_match_timeline_cache.sql`; deploy prints the function URL.

- [ ] **Step 6: Verify against the real project**

Run from the mobile package with the owner's signed-in session is not scriptable; instead: `npx supabase functions invoke match-timeline --body '{"matchId":"<a matchId from the Matches tab>","region":"NA"}'` using the CLI's service session. Expected: JSON with `v: 1`, `frames.length ≥ 10`. Second call: same JSON faster (cache hit; check `match_timeline_cache` has one row via `npx supabase db query` or the dashboard).

- [ ] **Step 7: Secret scan and commit (this repo only; the RiftLens copy is committed there by the owner's usual flow — mention it)**

```bash
git add supabase packages/shared/tests/timeline-reduce.test.ts
git diff --cached | grep -nE "eyJhbGci|RGAPI-" ; git commit -m "feat(supabase): match-timeline function + match_timeline_cache (reduced per-minute series)"
```

---

### Task 5: Mobile data — timeline + baseline hooks

**Files:**
- Modify: `apps/mobile/src/lib/riot-api.ts` (add `fetchMatchTimeline`), `apps/mobile/src/lib/match-keys.ts` (add `timeline`)
- Create: `apps/mobile/src/hooks/useMatchTimeline.ts`, `apps/mobile/src/hooks/useBaseline.ts`, `apps/mobile/src/lib/analysis-input.ts`
- Test: `apps/mobile/tests/analysis-input.test.ts`, `apps/mobile/tests/match-keys.test.ts` (extend if present, else create)

**Interfaces:**
- Consumes: `TimelineSeries`, `buildBaseline`, `analyzeMatch`, `AnalysisInput`, `MatchAnalysis` (Tasks 2–3); `matchDetailQuery`, `identityOf`, `matchKeys`, `fetchMatchIds`, `summarizeMatch`, `detailLimiter` pattern in `riot-api.ts`.
- Produces:
  ```ts
  export async function fetchMatchTimeline(client: SupabaseClient, input: { matchId: string; region: Region }): Promise<TimelineSeries> // invoke('match-timeline'); throws RiotApiError; validates v === 1 && Array.isArray(frames)
  matchKeys.timeline = (matchId: string) => ['match-timeline', matchId] as const
  export function useMatchTimeline(matchId: string | undefined, region: Region): UseQueryResult<TimelineSeries>   // staleTime Infinity, gcTime 1 day, retry like details, enabled when matchId
  export function useBaseline(account: LinkedAccount | null, role: Role | null, excludeMatchId: string): { baseline: Baseline | null; loading: boolean; n: number }
    // ids: same key as Matches (matchKeys.ids(puuid, 20)) → useQueries(matchDetailQuery(id, region, true)) for all 20 → summaries → buildBaseline; loading while any detail is pending
  export type AnalysisQueryState = { summary: MatchSummary | null; series: { status: 'pending' | 'error' | 'success'; data?: TimelineSeries; error?: unknown }; baseline: { loading: boolean; data: Baseline | null } }
  export function analysisInputFromQueries(s: AnalysisQueryState): { input: AnalysisInput | null; timelineError: unknown | null; baselineLoading: boolean }
    // summary null → input null; series error/pending → input.series null (areas without timeline still render), timelineError set on error
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// apps/mobile/tests/analysis-input.test.ts
it('returns null input without a summary', …)
it('passes a null series while the timeline is pending or errored, and exposes the error', …)   // Review Focus 5
it('passes the baseline only when it finished loading', …)
// match-keys: expect(matchKeys.timeline('NA1_1')).toEqual(['match-timeline', 'NA1_1'])
```

- [ ] **Step 2: Run to verify failure** — `pnpm -F @lpp/mobile exec vitest run tests/analysis-input.test.ts tests/match-keys.test.ts` Expected: FAIL.

- [ ] **Step 3: Implement the lib and hooks**

`fetchMatchTimeline` goes through the same 4-wide `detailLimiter` as details (Riot budget). `useBaseline` must not change `INITIAL_PAGE` behaviour of the Matches tab: it only enables the queries it needs from inside the review; React Query dedupes with the tab's cache.

- [ ] **Step 4: Run tests + checks** — `pnpm -F @lpp/mobile test && pnpm -r typecheck && pnpm -r lint` Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(mobile): match timeline + baseline hooks, analysis input assembly"`

---

### Task 6: Match Review UI — semi-donut areas, charts, how-it's-scored

**Files:**
- Create: `apps/mobile/src/components/SemiDonut.tsx`, `apps/mobile/src/components/AreaPills.tsx`, `apps/mobile/src/components/AreaCard.tsx`, `apps/mobile/src/components/SubrowBar.tsx`, `apps/mobile/src/components/OverallScoreCard.tsx`, `apps/mobile/src/components/CsCurveChart.tsx`, `apps/mobile/src/components/GoldDiffChart.tsx`, `apps/mobile/src/components/Collapsible.tsx`, `apps/mobile/src/lib/chart-geometry.ts`, `apps/mobile/src/lib/area-ui.ts`, `apps/mobile/src/app/(app)/(tabs)/matches/how-scored.tsx`
- Modify: `apps/mobile/src/app/(app)/(tabs)/matches/[matchId].tsx` (new order per spec 2.5), `apps/mobile/src/components/LiveTrendChart.tsx` (use `chart-geometry.ts` for the shared scale/path helpers; behaviour unchanged), `apps/mobile/src/components/LaneMatchupCard.tsx` (every row gets the two-sided share bar: extract `CompareBar` + `signed`/`cmp` helpers from `LiveMatchupTable.tsx` into `apps/mobile/src/components/CompareBar.tsx` and `apps/mobile/src/lib/compare.ts`, reuse in both; deaths invert so the bigger side is always the better side)
- Test: `apps/mobile/tests/chart-geometry.test.ts`, `apps/mobile/tests/area-ui.test.ts`

**Interfaces:**
- Consumes: `MatchAnalysis`, `AreaResult`, `Subrow`, `Rating` (Task 3), `csCurve`, `goldDiffCurve`, `PHASES` (Tasks 1–2), hooks from Task 5, `colors/font/space/radius` tokens, `TREND_YOU`/`TREND_ENEMY` colors.
- Produces:
  ```ts
  // chart-geometry.ts (pure)
  export function linearScale(domain: [number, number], range: [number, number]): (v: number) => number
  export function linePath(points: Array<{ x: number; y: number | null }>): string           // 'M… L…', gaps on null
  export function niceMax(values: number[], floor: number): number                               // ceil to a clean tick
  export function phaseBands(durationSec: number): Array<{ key: PhaseKey; startSec: number; endSec: number }> // bands that happened (PHASE_MIN_SEC rule)
  // area-ui.ts (pure)
  export function ratingColor(r: Rating | null): string        // Poor → colors.loss, Fair → colors.warn, Good → colors.accent, Great → colors.win, null → colors.muted
  export function barFraction(subrow: Subrow): number          // score/100 for scored rows; 0 for context rows
  export function deltaLabel(d: number | null, unit: string, who: 'opponent' | 'you', n?: number): string | null  // "+0.5 vs opponent", "−12 vs you (n=14)", null when d is null; "few games" when n < 3
  export function defaultArea(a: MatchAnalysis): AreaKey | null   // weakest, else first visible
  // compare.ts (pure, extracted from LiveMatchupTable)
  export function shareOf(me: number | null, enemy: number | null, lowerIsBetter?: boolean): { me: number; enemy: number } | null // fractions summing to 1; 8 vs 14 → { me: 0.364, enemy: 0.636 }; deaths 2 vs 6 with lowerIsBetter → { me: 0.75, enemy: 0.25 }; 0 vs 0 → { me: 0.5, enemy: 0.5 }; null when either is null
  export function cmp(me: number | null, enemy: number | null, lowerIsBetter?: boolean): 'me' | 'enemy' | 'tie'
  export function signed(me: number | null, enemy: number | null, decimals?: number): string | undefined
  // components
  SemiDonut({ score: number | null; size: number; color: string; label?: string })              // SVG half ring, number centred, "—" when null
  AreaPills({ areas: AreaResult[]; active: AreaKey; onChange(k: AreaKey) })
  AreaCard({ area: AreaResult; baselineN: number; chart?: ReactNode; onRetryTimeline?: () => void; timelineError?: unknown })
  OverallScoreCard({ analysis: Extract<MatchAnalysis, { analyzable: true }> })
  CsCurveChart({ curve: ReturnType<typeof csCurve>; durationSec: number; weakestPhase: PhaseKey | null })   // legend You/Enemy, phase bands, weakest shaded, 2 px lines, end markers, horizontal-drag tooltip (Phase 4 responder rules)
  GoldDiffChart({ curve: ReturnType<typeof goldDiffCurve>; durationSec: number })              // bars/area: positive you-color, negative enemy-color, zero line
  Collapsible({ title: string; children })                                                         // "Full lane comparison" wrapper for LaneMatchupCard
  ```
- `how-scored.tsx` route: `/(app)/(tabs)/matches/how-scored?role=BOTTOM&n=14` renders the targets for that role, the curves in words, weights, and the baseline sentence — the same facts as `docs/ANALYSIS.md`.

- [ ] **Step 1: Write the failing pure-helper tests**

```ts
// chart-geometry.test.ts
it('linearScale maps domain to range', …); it('linePath breaks on nulls', …)
it('phaseBands for a 9-minute game is just lane; for 42 minutes all three', …)
// area-ui.test.ts
it('ratingColor per rating', …); it('deltaLabel formats sign, unit, who and few games', …)
it('defaultArea returns the weakest visible area', …)
// compare.test.ts (apps/mobile/tests/compare.test.ts)
it('shareOf gives the better side the bigger share, inverts for lower-is-better, splits 0 vs 0 evenly, null on missing', …)
it('cmp and signed keep the Live tab behaviour (existing LiveMatchupTable rows still render the same deltas)', …)
```

- [ ] **Step 2: Run to verify failure** — Expected: FAIL.

- [ ] **Step 3: Implement helpers, components, route and the screen**

Screen order (spec 2.5): header → `MatchHero` → `OverallScoreCard` (or a "Analysis only for Summoner's Rift games" / remake note when `analyzable: false`) → `AreaPills` + `AreaCard` (Farming shows `CsCurveChart`, Lane shows `GoldDiffChart`; both only with a series) → `Collapsible("Full lane comparison")` with `LaneMatchupCard` → "How it's scored" link → `Disclaimer`. While the baseline loads, "vs you" shows "Calculating your average…". Keep the back button and the header as they are.

- [ ] **Step 4: Run tests + checks** — `pnpm -F @lpp/mobile test && pnpm -r typecheck && pnpm -r lint` Expected: PASS.

- [ ] **Step 5: Look at it** — restart Metro clean (`pkill -f "expo start"; expo start -c`), relaunch Expo Go, open a ranked/normal game from the Matches tab (synthetic tap via scratchpad `tap.py` after `osascript -e 'tell application "Simulator" to activate'`), screenshot each area pill, the collapsed/expanded lane matchup and the how-scored route. Check: no label collisions, legend present, nothing overflows at phone width, numbers match `docs/ANALYSIS.md` for that game when computed by hand for one area.

- [ ] **Step 6: Commit** — `git commit -m "feat(mobile): match review analysis — semi-donut areas, CS curve, gold diff, how it's scored"`

---

### Task 7: Phase 3 acceptance

**Files:**
- Modify: `DEVELOPMENT_PROGRESS.md` (Phase 3 section + checkbox), `.superpowers/sdd/2026-10-22-phase-3-analysis/progress.md`
- Create: `docs/screenshots/phase3-review-farming.png`, `docs/screenshots/phase3-review-lane.png`, `docs/screenshots/phase3-how-scored.png`

- [ ] **Step 1:** Owner opens three real reviews (one ADC game, one with no timeline yet — fresh game, and one ARAM): areas render with sentences, ARAM shows the reason, "vs you" shows `n`. Record what was seen.
- [ ] **Step 2:** Riot budget check: Supabase function logs for one newly opened review show 1 `match-timeline` Riot call; reopening shows a cache hit (`X-Cache: HIT`).
- [ ] **Step 3:** `pnpm -r lint && pnpm -r typecheck && pnpm -r test`; update progress + ledger; secret scan; commit `docs: phase 3 progress report`; push `phase-3-analysis`; request the final review (superpowers:requesting-code-review) on `main..phase-3-analysis`.
