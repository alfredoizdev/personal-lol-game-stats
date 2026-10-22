# Phase 7 — Riot Submission Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything LanePulse needs to be registered on the Riot Developer Portal as a larger-scale product: a public site with Terms and Privacy (also inside the app), verified data deletion, a private Realtime channel, opt-in status-only goal push notifications sent by the desktop, an EAS development build, and the application write-up with real call-budget numbers.

**Architecture:** Legal text lives once in `packages/shared` and is rendered into a static site (`apps/site/`, plain HTML) and into two mobile screens. The Live channel moves to a private `lanepulse:<uid>` topic guarded by `realtime.messages` policies. A pure `goal-notifier` engine in `packages/shared` decides when a status notification is due; the desktop reads the user's goal, prefs and tokens under RLS and posts to the Expo Push API. The phone registers its token (outside Expo Go only) and exposes the opt-in in Profile. No new Riot calls, no changes to the analysis engine.

**Tech Stack:** TypeScript, Vitest, Expo SDK 58 (+ `expo-notifications`, `expo-dev-client`, EAS), Electron, Supabase (migrations, Realtime Authorization), plain HTML/CSS for the site.

**Spec:** `docs/superpowers/specs/2026-10-22-phase-7-riot-submission-design.md` (sections 2.1–2.7, decisions in 6 and the builder-check decisions inside 2.3/2.4). General design 11b. Riot policy notes: ContextForge "Riot Developer Portal — Registration path + policy constraints".

## Global Constraints

- Notification copy is status only: `"${mm:ss} · Goal ${formatGoal(goal)} · ${status}, now ${value}"` and the final `"Game over · Goal met|missed · ${value}"`; the words "should", "try", "need", "more", "less" never appear in generated copy (asserted by test).
- Nothing is sent unless `notification_prefs.goal_push = true`; first notification never before 60 s of game time; never two within 60 s; `interval` mode fires at every 5:00 multiple of game time and on status change; `change` mode only on the first known status and on changes.
- New tables: `lanepulse_push_tokens` and `notification_prefs` exactly as spec 2.6, RLS own, grants to `authenticated`, all to `service_role`. Realtime policies on `realtime.messages` only for topic `'lanepulse:' || auth.uid()` (select + insert, `realtime.messages.extension = 'broadcast'`).
- Channel name everywhere = `liveTopic(userId)` = `` `lanepulse:${userId}` ``; both ends use `config: { private: true }`.
- `expo-notifications` is required lazily and never in Expo Go (`Constants.executionEnvironment === ExecutionEnvironment.StoreClient` → skip).
- Legal text has no `TBD`; entity placeholder is exactly `LanePulse (an independent developer)` with source marker `<!-- LEGAL_ENTITY: revisar antes de publicar -->`; contact `alfredodevelop@gmail.com`; `LEGAL_VERSION = '2026-10-22'`.
- Riot key never in any client; the site has no scripts calling Riot. Disclaimer text = `RIOT_DISCLAIMER` on every site page.
- `pnpm -r typecheck && pnpm -r lint && pnpm -r test` green per task; one commit per task ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; secret scan before push; migrations copied verbatim to `~/Desktop/lol-app-ui/desktop-app/supabase/migrations/` and applied with `supabase db push` from there, command shown first.

## Review Focus

1. Desktop signed in as user A while the phone is signed in as user B (two devices, one household): no push and no snapshot crosses accounts — tokens, prefs and goals are read under A's JWT; the private topic is A's (Task 3 test: `liveTopic`; Task 5 test: notifier reads only rows for its userId; manual check in Task 8).
2. Game with the goal metric `kpPct` and 0 team kills for 8 minutes: no notification until the first non-null value; `interval` mode must not emit "—" (Task 4 test).
3. Desktop loses network mid-game: the poller keeps publishing; the notifier logs and retries at the next due event, never throws (Task 5 test with a rejecting fetch).
4. Expo returns `DeviceNotRegistered` for one of two tokens: that token is revoked, the other still receives the next message (Task 5 test).
5. User opens Terms from the sign-up form, reads, comes back: the form keeps its values (Task 1: legal screens are routes outside `(app)`, pushed with `router.push`, not a modal that unmounts the form; manual check in Task 8).

---

### Task 1: Legal text, public site, legal screens

**Files:**
- Create: `packages/shared/src/legal.ts`, `apps/site/build.mjs`, `apps/site/src/{index.html,site.css}`, `apps/site/package.json` (`"build": "node build.mjs"` → `apps/site/dist/{index,terms,privacy}.html`), `apps/site/vercel.json` (`{"outputDirectory":"dist","buildCommand":"node build.mjs"}`), `apps/mobile/src/app/legal/_layout.tsx`, `apps/mobile/src/app/legal/terms.tsx`, `apps/mobile/src/app/legal/privacy.tsx`, `apps/mobile/src/components/LegalDocument.tsx`
- Modify: `packages/shared/src/index.ts` (export `./legal`), `apps/mobile/src/app/(auth)/sign-up.tsx` (checkbox label with two `Link`s; `acceptedLegalVersion: LEGAL_VERSION` in sign-up `options.data`), `apps/mobile/src/app/(app)/(tabs)/profile.tsx` (section "Legal": Terms, Privacy, `Accepted version ${user.user_metadata.acceptedLegalVersion ?? '—'}`), `apps/mobile/src/lib/route-guard.ts` (segment `legal` is never redirected), `apps/mobile/src/lib/post-signup.ts` only if the metadata shape needs it (read it first), `.gitignore` (`apps/site/dist/`)
- Test: `packages/shared/tests/legal.test.ts`, `apps/mobile/tests/route-guard.test.ts` (legal segment), `apps/site/build.test.mjs` run by `node --test` from the site package (`"test": "node --test"`)

**Interfaces:**
- Produces:
  ```ts
  // legal.ts
  export const LEGAL_VERSION = '2026-10-22'
  export const LEGAL_CONTACT = 'alfredodevelop@gmail.com'
  export const LEGAL_ENTITY = 'LanePulse (an independent developer)' // <!-- LEGAL_ENTITY: revisar antes de publicar -->
  export type LegalSection = { heading: string; paragraphs: string[] }
  export const TERMS_SECTIONS: readonly LegalSection[]     // ≥ 8 sections: acceptance, the service, your account, Riot data & disclaimer, acceptable use, availability, termination, liability, changes, contact
  export const PRIVACY_SECTIONS: readonly LegalSection[]   // ≥ 9: who we are, data we collect (table-like paragraphs), why, where (Supabase), third parties (Riot, Supabase, Expo push), retention, deletion, children (13+), your rights, contact
  export function renderLegalHtml(title: string, sections: readonly LegalSection[]): string // full HTML page body fragment: <h1>, <h2>/<p>, version + contact footer, RIOT_DISCLAIMER
  ```
- [ ] **Step 1: Failing tests.** `legal.test.ts`: both section lists non-empty with the minimum counts; no paragraph contains `TBD`; `renderLegalHtml` output contains `LEGAL_VERSION`, `LEGAL_CONTACT`, `RIOT_DISCLAIMER`, one `<h2>` per section. `route-guard.test.ts`: `resolveAppGroupRedirect` is not used for `legal`, add a test that `isPublicSegment('legal')` is true (new helper in route-guard: `export function isPublicSegment(segment: string | undefined): boolean` → `'legal' | '(auth)'`). `build.test.mjs`: running `build.mjs` writes three files, each containing the disclaimer and `rel="noopener"` for external links.
- [ ] **Step 2: Run** `pnpm -F @lpp/shared test -- legal`, `pnpm -F @lpp/mobile test -- route-guard`, `pnpm -F @lpp/site test` → FAIL.
- [ ] **Step 3: Implement** legal.ts (write the actual English text: plain, specific to LanePulse: Riot ID/puuid, cached match data keyed by match id, live snapshots transient and never stored, goals, push tokens, deletion via Profile, no sale of data), `build.mjs` (reads `src/index.html` template + `site.css`, injects `renderLegalHtml` output for the two legal pages and a product page with the disclaimer, the feature list and image placeholders `docs/screenshots/phase6-*.png` copied to `dist/img/`), the `LegalDocument` component (ScrollView, headings, paragraphs, `maxFontSizeMultiplier`), the two screens, the root `_layout.tsx` for `/legal` (Stack, header shown with a back button), sign-up links (`<Link href="/legal/terms">`), Profile section, route guard.
- [ ] **Step 4: Run** all three suites + typecheck + lint → PASS. `pnpm -F @lpp/site build` produces `dist/`.
- [ ] **Step 5: Commit** `feat(legal): terms and privacy text shared by the public site and the app; legal screens and links`.

### Task 2: Migrations — push tokens, notification prefs, private channel policies

**Files:**
- Create: `supabase/migrations/20261023000001_lanepulse_push_tokens.sql`, `supabase/migrations/20261023000002_notification_prefs.sql`, `supabase/migrations/20261023000003_realtime_lanepulse_private.sql`
- Modify: `supabase/README.md` (table rows + deploy commands)
- Test: `packages/shared/tests/migrations-phase7.test.ts` (reads the three files and asserts the table names, `enable row level security`, the four grants, the topic expression `'lanepulse:' || auth.uid()`, `extension = 'broadcast'` — a text test that guards against a copy going stale)

- [ ] **Step 1: Failing test** as above. **Step 2: Run** → FAIL (files missing).
- [ ] **Step 3: Write the three migrations** exactly as spec 2.6 and 2.3. Realtime policies:
  ```sql
  create policy "lanepulse_live_receive" on realtime.messages for select to authenticated
    using (realtime.messages.extension = 'broadcast' and realtime.topic() = 'lanepulse:' || auth.uid()::text);
  create policy "lanepulse_live_send" on realtime.messages for insert to authenticated
    with check (realtime.messages.extension = 'broadcast' and realtime.topic() = 'lanepulse:' || auth.uid()::text);
  ```
- [ ] **Step 4: Run** → PASS. Copy the three files verbatim to `~/Desktop/lol-app-ui/desktop-app/supabase/migrations/`, show `cd ~/Desktop/lol-app-ui/desktop-app && supabase db push` to the owner, run it, record the output in the ledger.
- [ ] **Step 5: Commit** `feat(supabase): lanepulse_push_tokens, notification_prefs, private live channel policies`.

### Task 3: Private Live channel (shared helper, desktop, mobile)

**Files:**
- Create: `packages/shared/src/live-topic.ts`
- Modify: `packages/shared/src/index.ts`, `apps/desktop/electron/live/live-publisher.ts` (`client.channel(liveTopic(userId), { config: { private: true } })`), `apps/mobile/src/hooks/useLiveSnapshot.ts` (same), `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md` section 6.3 (one line: topic renamed and private as of Phase 7)
- Test: `packages/shared/tests/live-topic.test.ts`, `apps/desktop/tests/live-publisher.test.ts` (existing — update: channel name and `private: true` passed)

**Interfaces:** `export function liveTopic(userId: string): string` → `` `lanepulse:${userId}` ``; throws on empty id.
- [ ] **Step 1: Failing tests.** **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** shared + desktop + mobile suites → PASS. Manual: demo feed (`LPP_LIVE_DEMO=1`, League closed) reaches the simulator on the private channel; note the result in the ledger.
- [ ] **Step 5: Commit** `feat(live): private lanepulse:<uid> channel on both ends`.

### Task 4: Goal notifier engine (shared, pure)

**Files:**
- Create: `packages/shared/src/notify/goal-notifier.ts`, `packages/shared/src/notify/index.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/goal-notifier.test.ts`

**Interfaces:**
```ts
export type GoalPushMode = 'change' | 'interval'
export const PUSH_MIN_GAME_SEC = 60
export const PUSH_MIN_GAP_SEC = 60
export const PUSH_INTERVAL_SEC = 300
export type NotifierState = { lastStatus: GoalStatus | null; lastSentGameSec: number | null; lastIntervalMark: number | null; finalSent: boolean }
export const initialNotifierState: NotifierState
export type Due = { title: 'LanePulse'; body: string; kind: 'status' | 'final' } | null
/** Decides whether a notification is due for this snapshot; pure. `ended` = the game is over (final message). */
export function nextNotification(state: NotifierState, input: { goal: Goal; snapshot: LiveSnapshotV2; mode: GoalPushMode; ended: boolean }): { state: NotifierState; due: Due }
export function statusBody(gameSec: number, goal: Goal, status: GoalStatus, value: number | null): string   // "15:00 · Goal 7.0 CS/min · Below goal, now 5.2"
export function finalBody(goal: Goal, met: boolean, value: number | null): string                          // "Game over · Goal met · 7.3 CS/min"
```
Uses `liveMetrics`, `goalStatus`, `goalMet`, `formatGoal`, `metricInfo` from `prematch/goal`.
- [ ] **Step 1: Failing tests:** nothing before 60 s; nothing while value null (KP, 0 kills); `change`: first known status sends, same status later does not, flip sends; `interval`: 5:00 and 10:00 send even without change, plus a flip at 7:30, never two within 60 s; `ended` sends the final once with met/missed; copy assertions (exact strings, forbidden words).
- [ ] **Step 2–4:** RED → implement → GREEN. **Step 5: Commit** `feat(shared): goal notifier engine (status-only push timing and copy)`.

### Task 5: Desktop sends the notifications

**Files:**
- Create: `apps/desktop/electron/notify/goal-push.ts` (`createGoalPush(client, userId, opts: { fetch?: typeof fetch; log: Logger })` → `{ onLiveState(state: LiveState): Promise<void>; reset(): void }`), `apps/desktop/electron/notify/expo-push.ts` (`sendExpoPush(fetch, messages: ExpoPushMessage[]): Promise<Array<{ token: string; ok: boolean; deviceNotRegistered: boolean }>>`), `apps/desktop/electron/notify/champions.ts` (DDragon `champion.json` → `byName`, cached per version in memory; reuse `championIdByName` logic from shared if exported, else move `championIdByName` to shared `ddragon.ts` first)
- Modify: `apps/desktop/electron/main.ts` (create on sign-in, call `onLiveState` from `onLiveState`, `reset()` on stop/sign-out), `packages/shared/src/ddragon.ts` if `championIdByName` moves
- Test: `apps/desktop/tests/goal-push.test.ts` (fake Supabase client returning prefs/tokens/goals/linked accounts; fake fetch), `apps/desktop/tests/expo-push.test.ts`

**Behaviour:** on each live state: if prefs not loaded or older than 60 s → reload `notification_prefs`, `lanepulse_push_tokens` (non-revoked), `linked_riot_accounts` (to map LCU Riot ID → puuid, case-insensitive), `pre_match_focus` (newest per champion/role, via `rowToGoal` logic duplicated in shared if needed → put `rowToGoal` in `packages/shared/src/prematch/goal-rows.ts`); resolve `goalFor(goals, puuid, byName(snapshot.me.championName), snapshot.me.position)`; run `nextNotification`; if due and `goal_push`, `sendExpoPush` with `{ to, title, body, data: { app: 'lanepulse', route: '/(app)/(tabs)/live' }, channelId: 'goals', priority: 'high' }`; revoke `DeviceNotRegistered` tokens (`update ... set revoked_at`); catch everything, `log.warn`.
- [ ] **Step 1: Failing tests:** prefs off → no fetch; on + due → one POST per token with the exact body; `DeviceNotRegistered` → update called for that token only; rejecting fetch → resolves, warns, state unchanged for retry; snapshot for a champion without goal → nothing; game end → final once.
- [ ] **Step 2–4:** RED → implement → GREEN (desktop suite). **Step 5: Commit** `feat(desktop): status-only goal push via Expo (opt-in, per-account rows under RLS)`.

### Task 6: Mobile — token registration, Profile toggle, tap routing, EAS config

**Files:**
- Create: `apps/mobile/src/lib/push-notifications.ts` (lazy `expo-notifications`; `registerPushToken(client, userId)`; `isPushSupported()` false in Expo Go / simulator), `apps/mobile/src/hooks/usePushRegistration.ts` (mount in `(app)/_layout.tsx`), `apps/mobile/src/lib/notification-prefs.ts` (`fetchPrefs`, `savePrefs` → upsert), `apps/mobile/src/hooks/useNotificationPrefs.ts`, `apps/mobile/src/components/GoalPushSettings.tsx` (switch + two radio rows + "Status only — never tips."), `apps/mobile/eas.json` (development: `developmentClient: true`, `distribution: internal`, iOS simulator true; preview; production), `docs/riot/build.md` (owner steps: `npx eas login`, `eas init`, `eas build --profile development --platform android|ios`, credentials notes)
- Modify: `apps/mobile/package.json` (`expo-notifications`, `expo-dev-client`, `expo-constants` already), `apps/mobile/app.json` (`plugins`: `expo-notifications` with icon/colour; `extra.eas.projectId` left for `eas init`), `apps/mobile/src/app/(app)/(tabs)/profile.tsx` (section "Notifications" → `GoalPushSettings`; the delete confirmation enumerates what is removed: account, linked Riot accounts, goals, notification settings and push tokens — spec 2.2), `apps/mobile/src/app/_layout.tsx` or `(app)/_layout.tsx` (response listener: `data.app === 'lanepulse'` → `router.navigate(data.route)`, else ignore)
- Test: `apps/mobile/tests/notification-prefs.test.ts` (row ↔ prefs mapping, default `{ goalPush: false, mode: 'change' }`), `apps/mobile/tests/push-routing.test.ts` (`routeForNotification(data)` → route or null for foreign/malformed payloads), `apps/mobile/tests/push-support.test.ts` (`isPushSupported({ executionEnvironment, isDevice })`)
- [ ] **Step 1: Failing tests.** **Step 2: Run** → FAIL. **Step 3: Implement** (install deps with `pnpm add` in the mobile package; keep Expo Go working: no top-level import of `expo-notifications`). **Step 4: Run** mobile suite + typecheck + lint → PASS; Expo Go still boots (simulator check). **Step 5: Commit** `feat(mobile): push token registration, goal notification settings, EAS config`.

### Task 7: Application write-up, deletion verification, progress docs

**Files:**
- Create: `docs/riot/application.md`, `docs/riot/call-budget.md` (numbers derived from code constants: `INITIAL_PAGE`, paging, `staleTime` values, `BACKFILL_COUNT`, timeline once per review; worst-case per user per day and per 10 s against the production limits), `docs/riot/deletion.md` (cascade table from the migrations: table → FK → cascade yes/no → note)
- Modify: `DEVELOPMENT_PROGRESS.md` (Phase 7 entry + tasks), `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md` 11b (pointer to Phase 7 spec)
- [ ] **Step 1:** Write `call-budget.md` by reading the constants (cite file:line for each). **Step 2:** Write `application.md` (product name, description, what it does not do, regions = `REGIONS` with NA primary, platforms, URLs = Vercel default + `/terms.html` + `/privacy.html`, contact, endpoints table, cache story, policy self-check table with the screen that proves each line, screenshot checklist). **Step 3:** Write `deletion.md`. **Step 4:** Progress doc. **Step 5: Commit** `docs(riot): application write-up, call budget, deletion verification`.

### Task 8: Acceptance

- [ ] **Step 1:** `pnpm -r typecheck && pnpm -r lint && pnpm -r test` + `pnpm -F @lpp/site build` → green; record counts.
- [ ] **Step 2:** Simulator: legal screens from sign-up (form values kept) and from Profile; Profile notifications section; Live still receives the demo feed on the private channel. Screenshots `docs/screenshots/phase7-{legal,profile-notifications}.png`.
- [ ] **Step 3:** Owner-dependent (documented in `docs/riot/build.md`, not blocking the merge): `eas init` + development build on a device; one real game with a saved goal and the toggle on → notifications arrive; `vercel deploy` of `apps/site`.
- [ ] **Step 4:** Secret scan, final review package, review.
