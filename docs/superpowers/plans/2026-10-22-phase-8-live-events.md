# Phase 8 — Live: client phase, in-game events and in-app alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Live tab follows the whole session (client phase with a queue timer, death state with respawn countdown, game events as the game shows them, in-app alert cards for goal changes and events) and returns to Prepare when the game ends.

**Architecture:** The desktop publishes a second broadcast event `live-phase` on the private channel and extends the snapshot with optional `isDead`/`respawnSec` and a normalized `events` list (all from the `allgamedata` it already reads; pure normalizer in shared). The phone parses both with defaults, derives alerts between consecutive snapshots with a pure engine, and renders an `AlertStack`, a dead-state portrait, an events feed and a phase card. No new native modules.

**Tech Stack:** TypeScript, Vitest, Expo SDK 58 (JS only), Electron, Supabase Realtime (existing private channel).

**Spec:** `docs/superpowers/specs/2026-10-22-phase-8-live-events-design.md`

## Global Constraints

- Snapshot stays `v: 2`; new fields are optional on the wire and defaulted by `parseLiveSnapshot` (`isDead: null`, `respawnSec: null`, `events: []`). A desktop without the fields must still drive the phone.
- `live-phase` payload exactly `{ v: 1, ts: number, phase: GameflowPhase, since: number }`; published on phase change and every 10 s; phone ignores anything that fails `parseLivePhase`.
- Events on the wire: at most `MAX_EVENTS = 20`, newest last; `actor`/`victim` are champion names; unknown `EventName` dropped.
- All alert/event copy is status only: the forbidden-word regex from `goal-notifier.test.ts` applies to every string `eventLine`/`alertFor` can produce (asserted by test). No imperative about play.
- No new dependency with native code; `pnpm -r typecheck && pnpm -r lint && pnpm -r test` green per task; one commit per task ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. Old desktop (Phase 7 build) + new phone: snapshots without `events`/`isDead` parse, no alerts fire, hero renders as before (Task 1 parser defaults test; Task 4 renders with `events: []`).
2. Respawn countdown with sparse snapshots (publish only on change / 10 s heartbeat): the phone must count down locally from the last `respawnSec` and clamp at 0; a snapshot that says alive clears it immediately (Task 2 `respawnNow` test).
3. Two kills in the same second / duplicated events on reconnect: alerts keyed by event `id` (EventID), never re-shown; after `isFinal` the seen set resets for the next game (Task 2 `newEvents` test, Task 4 hook).
4. Phase heartbeat lost (desktop closed mid-queue): the phase card must not show a queue timer forever — phase older than 30 s shows "Waiting for a match" again (Task 2 `phaseView` test with `receivedAt`).
5. Game end: ENDED hero, then automatic return to Prepare on `live-phase` ≠ in-game or after 60 s, with the compact "Last match" card; the next game's first snapshot must replace it (Task 2 `liveScreenMode` test; Task 4).

---

### Task 1: Shared — snapshot fields, event normalizer, phase payload

**Files:**
- Modify: `packages/shared/src/live.ts` (RawLivePlayer += `isDead?`, `respawnTimer?`; RawAllGameData += `events?: { Events?: RawLiveEvent[] }`; LivePlayerV2 += `isDead`, `respawnSec`; LiveSnapshotV2 += `events: LiveEvent[]`; `buildLiveSnapshot` fills them; `parseLiveSnapshot` defaults; `shouldPublish` unchanged)
- Create: `packages/shared/src/live-events.ts` (`RawLiveEvent`, `LiveEvent`, `LiveEventType`, `MAX_EVENTS`, `normalizeEvents(raw, players, me)`, `parseLiveEvent`), `packages/shared/src/live-phase.ts` (`LivePhasePayload`, `buildLivePhase(phase, since, ts)`, `parseLivePhase(payload)`)
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/live-events.test.ts`, `packages/shared/tests/live-phase.test.ts`, `packages/shared/tests/live.test.ts` (add: builder fills isDead/respawnSec/events; parser defaults when absent; parser rejects malformed events)

**Interfaces (Produces):**
```ts
export type LiveEventType = 'GameStart' | 'MinionsSpawning' | 'FirstBlood' | 'ChampionKill' | 'Multikill' | 'Ace' | 'DragonKill' | 'HeraldKill' | 'BaronKill' | 'TurretKilled' | 'InhibKilled' | 'GameEnd'
export type LiveEvent = { id: number; time: number; type: LiveEventType; actor: string | null; victim: string | null; assisters: string[]; actorIsMe: boolean; victimIsMe: boolean; actorIsAlly: boolean | null; meta: { killStreak?: number; dragonType?: string; stolen?: boolean; result?: 'Win' | 'Lose' } }
export const MAX_EVENTS = 20
export function normalizeEvents(raw: RawAllGameData, me: RawLivePlayer): LiveEvent[]   // last MAX_EVENTS, by EventID asc; names → champion names via allPlayers (summonerName or riotId "Name#TAG"); turret/inhib actors like "Turret_T1_…" → actor null, victim = structure label
export type LivePhasePayload = { v: 1; ts: number; phase: GameflowPhase; since: number }
export function buildLivePhase(phase: GameflowPhase, since: number, ts: number): LivePhasePayload
export function parseLivePhase(payload: unknown): LivePhasePayload | null
```
- [ ] **Step 1: Failing tests** — normalizer: maps a ChampionKill where I am the killer (actorIsMe), where I am the victim (victimIsMe, assisters mapped), a Multikill with KillStreak 2, a DragonKill by an ally (actorIsAlly true, dragonType), an enemy TurretKilled (victim 'Turret', actorIsAlly false), unknown type dropped, more than 20 → last 20, EventID order kept. Parser: snapshot without the new fields → defaults; with `events` containing a bad item → null. Phase: round-trip; bad phase string → null.
- [ ] **Step 2: Run** `pnpm -F @lpp/shared test -- live` → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `pnpm -r typecheck` (desktop/mobile compile against the widened types; fix fixture typing if needed).
- [ ] **Step 5: Commit** `feat(shared): live snapshot carries death state and normalized game events; live-phase payload`.

### Task 2: Shared — view engines (alerts, event copy, respawn, phase view, screen mode)

**Files:**
- Create: `packages/shared/src/live-view.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/live-view.test.ts`

**Interfaces (Produces):**
```ts
export type LiveAlert = { id: string; kind: 'goal' | 'kill' | 'death' | 'assist' | 'multikill' | 'objective' | 'structure' | 'ace' | 'first_blood' | 'match_found'; title: string; body: string | null; tone: 'good' | 'bad' | 'neutral' }
export function eventLine(e: LiveEvent): { title: string; body: string | null; tone: LiveAlert['tone'] } | null  // null for events not worth a line (GameStart, MinionsSpawning, kills between others)
export function newEvents(seen: ReadonlySet<number>, events: LiveEvent[]): LiveEvent[]
export function alertsForSnapshot(input: { seen: ReadonlySet<number>; snapshot: LiveSnapshotV2; goalPrev: GoalStatus | null; goalNext: GoalStatus | null; goalText: string | null; goalNow: string | null }): LiveAlert[]
export function respawnNow(p: Pick<LivePlayerV2, 'isDead' | 'respawnSec'>, snapshotTs: number, nowMs: number): number | null   // ceil(respawnSec − elapsed), ≥ 1 while dead; null when alive/unknown or reached 0
export const PHASE_LABEL: Record<GameflowPhase, string>
export function phaseView(phase: LivePhasePayload | null, receivedAtMs: number, nowMs: number): { label: string; timer: string | null } // 'Searching for a match' + mm:ss from since+elapsed; null label fallback 'Waiting for a match' when older than 30 s or absent
export type LiveScreenMode = 'pre' | 'live' | 'ended' | 'after'
export function liveScreenMode(input: { view: LiveViewState; endedAtMs: number | null; nowMs: number; phase: GameflowPhase | null; dismissed: boolean }): LiveScreenMode // ended → 'after' when phase ∉ {InProgress, Reconnect, GameStart} or 60 s elapsed; 'after' shows the Last-match card until dismissed/new game
export function lastMatchLine(snapshot: LiveSnapshotV2, goal: { text: string; met: boolean | null } | null): string // "Yasuo · 24:10 · Goal met"
```
- [ ] **Step 1: Failing tests** for each (copy exact strings: "You killed Yone", "Killed by Yone", "Assist on Zed", "Double kill!" / "Triple kill!" / "Quadra kill!" / "Penta kill!", "First blood", "Your team took Dragon · Infernal", "Enemy team took Baron", "Turret down", "Your turret fell", "Ace!", "Match found"; forbidden-word regex over every producible string; respawn countdown with elapsed; phase timer; screen mode transitions incl. the 60 s fallback and reset by a new live snapshot).
- [ ] **Step 2–4:** RED → implement → GREEN. **Step 5: Commit** `feat(shared): live view engines (alerts, event copy, respawn countdown, phase view, screen mode)`.

### Task 3: Desktop — publish phase, extend demo

**Files:**
- Modify: `apps/desktop/electron/live/live-publisher.ts` (`publishPhase(payload: LivePhasePayload)` on the same channel, event `live-phase`), `apps/desktop/electron/main.ts` (waiting/idle states → `publishPhase`; `since` tracked per phase; heartbeat every 10 s while waiting), `apps/desktop/electron/live/demo-feed.ts` (phases script: Matchmaking 6 s → ReadyCheck 3 s → ChampSelect 4 s → InProgress 60 s → EndOfGame 4 s → Lobby; in game: my death at 30 s with respawnTimer 20→0, a kill at 20 s, a DragonKill by an ally at 40 s, events list), `apps/desktop/fixtures/live-allgamedata.json` only if needed
- Test: `apps/desktop/tests/live-publisher.test.ts` (publishPhase sends `live-phase` with the payload; shares the channel), `apps/desktop/tests/live-poller.test.ts` unchanged
- [ ] **Step 1–4:** RED → GREEN. Manual: demo (League closed) shows the phase sequence in the desktop log. **Step 5: Commit** `feat(desktop): publish client phase on the live channel; demo plays a full session with a death and events`.

### Task 4: Mobile — phase card, dead portrait, alerts, feed, return to Prepare

**Files:**
- Modify: `apps/mobile/src/hooks/useLiveSnapshot.ts` (also `.on('broadcast', { event: 'live-phase' })` → `phase` + `phaseReceivedAt`; expose `endedAt`), `apps/mobile/src/app/(app)/(tabs)/live.tsx` (mode from `liveScreenMode`; `PhaseCard` instead of the static waiting card; `AlertStack` at top; `EventsFeed` under tiles; `LastMatchCard` in 'after'), `apps/mobile/src/components/LiveHero.tsx` (dead portrait: dim + countdown number via `respawnNow`, ticking each second), `apps/mobile/src/lib/push-notifications.ts` (handler: `shouldShowBanner: AppState.currentState !== 'active'`)
- Create: `apps/mobile/src/components/live/AlertStack.tsx` (max 3, 5 s auto-dismiss, tap dismiss, slide-in with `Animated`), `apps/mobile/src/components/live/PhaseCard.tsx`, `apps/mobile/src/components/live/EventsFeed.tsx`, `apps/mobile/src/components/live/LastMatchCard.tsx`, `apps/mobile/src/hooks/useLiveAlerts.ts` (seen-set per game, resets on `isFinal`/new game; feeds `alertsForSnapshot`), `apps/mobile/src/lib/live-alerts-queue.ts` (pure queue: push/expire/cap 3) + test
- Test: `apps/mobile/tests/live-alerts-queue.test.ts`
- [ ] **Step 1–4:** RED (queue) → GREEN; typecheck/lint; simulator with the demo: phase sequence, death countdown, alerts, feed, return to Prepare with Last-match card. Screenshots `docs/screenshots/phase8-{phase,dead,alerts,after}.png`.
- [ ] **Step 5: Commit** `feat(mobile): live phase card, death countdown, in-app alerts and events feed; back to Prepare after the game`.

### Task 5: Docs and acceptance

- [ ] `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md` §6.3 (one line: `live-phase` event + optional snapshot fields), `DEVELOPMENT_PROGRESS.md` (Phase 8 entry; end-of-game sync becomes Phase 9), `docs/riot/application.md` (Live description mentions events/death timer as shown by the client).
- [ ] `pnpm -r typecheck && pnpm -r lint && pnpm -r test`; secret scan; final review package.
