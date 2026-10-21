# LoL Personal Performance — Product Specification & Implementation Roadmap

**Version:** 1.0  
**Date:** 2026-10-21  
**Status:** Planning / ready for phased development  
**Audience:** Claude Code (implementation agent), product owner  
**Primary platforms:** iOS/iPadOS and Android tablets/phones with **Expo / React Native**; **macOS and Windows** with **Electron**.

> **Claude: This file is the source of truth.** Build incrementally, one phase at a time. Do not invent Riot API capabilities or claim unverified client integrations work. Prioritize a working vertical slice over broad unfinished scaffolding. At the end of each phase, provide a concise implementation report, changed files, commands, test results, limitations, and next steps. Ask for secrets only when needed; do not commit secrets.

## 0. Product vision

Create a **simple personal League of Legends performance companion**, not another overwhelming OP.GG/Blitz-style dashboard. It has exactly **two main user-facing features**:

1. **My Matches / Match Analysis** — list recent matches; tap one to review *your* performance and receive evidence-based, intuitive tips: what went well, what needs work, and one practical training focus. Separate individual performance from match outcome.
2. **Live Companion** — a second-screen display on a phone/tablet while League runs on Mac/Windows. Show permitted live personal stats, simple progress toward a pre-selected focus, and limited opponent/lane comparisons **only to the extent allowed by Riot policy and the data actually available**. A pre-game area can show historical difficult matchups and potential bans based on *the player's own past matches*, provided such use is policy-compliant. The app must not autonomously decide bans or supply forbidden actionable mid-game advice.

**Deferred (not MVP):** conversational AI coach, live tactical callouts, automated champion-select decisioning, overlays, video analysis, complex social features, subscriptions.

**Core UX:** Mobile-first, tablet-enhanced, accessible dark theme, restrained LoL-inspired accents without copying Riot's product trade dress. Two tabs only: `Matches` and `Live`. Short human-readable insights rather than 40 raw metrics. Empty/offline/loading/error states matter.

## 1. Scope, guardrails and key technical realities

- **Historical data:** Riot Account-v1 (Riot ID -> PUUID), Match-v5 (match list, details, timeline); Data Dragon for champion/item data. Requests must go through backend so Riot API keys never live in mobile apps or Electron renderer.
- **Live data:** `https://127.0.0.1:2999/liveclientdata/...` is available **locally on the gaming computer during an active match**. Electron **main process** collects only needed fields, authenticates with our backend, and relays sanitized payloads to the paired device. The Expo app does **not** connect directly to the LoL client.
- **Champion Select detection / automatic bans:** The **League Client API is officially unsupported**; may change, differ by platform, and requires disclosure to Riot. Build a **manual pre-match selection fallback first** (choose champion/role and see historical matchup insights). Do not make automated champ-select polling a required dependency of the MVP. Implement only after specific documentation/policy review and technical validation on actual macOS and Windows clients.
- **Riot policy:** Training using a player's match history and aggregate stats is an accepted type of application, but dynamic real-time advice that dictates choices, hidden opponent tracking, or competitive unfair advantage is not. All live opponent comparisons and contextual recommendations require review prior to public launch. If uncertain, display only own stats, static training goals, and post-match coaching. Never read game memory, inject into the process, automate inputs/bans, or circumvent security/anti-cheat protections.
- **Permission and launch:** Register product in Riot Developer Portal; development key for local POC, obtain appropriate production access before public beta. Do not promise Riot Sign On (RSO) until approval. Present Riot-required disclaimer and privacy policy. All screenshots/assets must honor Riot IP terms.
- **Platform caveat:** Validate Live Client Data API availability on **both** macOS and Windows in real matches before claiming cross-platform live support. If the client API is unavailable in a given scenario, show `Waiting for game` rather than fabricating data.
- **Privacy:** User opt-in for pairing and data transmission; transmit only selected stats, not whole playerlist or tokens. Set reasonable retention and deletion controls. Never expose local client credentials to mobile or server.

## 2. Proposed architecture

```text
             Riot Public APIs (Account-v1 / Match-v5 / Data Dragon)
                                    |
                                    v
Expo iOS / Android <-- HTTPS --> API service (Node.js + TypeScript)
      |                                   |
      |                                PostgreSQL
      |                                   |
      +-------- secure WebSocket ---------+------ authenticated WebSocket
                                                  |
                                             Electron main process
                                                  |
                                         Live Client Data API
                                       (localhost:2999, match only)
```

### Recommended stack

- **Monorepo:** pnpm workspaces; TypeScript strict mode.
- **Mobile/tablet:** Expo, React Native, Expo Router, React Query/TanStack Query; responsive phone/tablet layouts; Expo development builds where required; SecureStore for device session tokens.
- **Desktop:** Electron + Vite + React, Electron main/preload/renderer isolation, secure IPC, electron-builder or electron-forge for `.dmg` and Windows installer. Store pairing credentials with an OS-appropriate secure mechanism (e.g. keytar or validated equivalent), never plaintext source.
- **Backend:** Node.js TypeScript (Fastify or NestJS; choose one), REST API, WebSocket transport (native ws or Socket.IO; choose one), zod validation, Prisma + PostgreSQL, Redis only if needed later.
- **Shared packages:** domain/types, metric calculations, schemas, design tokens, Riot normalization and test fixtures.
- **Testing:** Vitest unit tests, contract tests for Riot parsing and metrics; selected integration/E2E tests; CI lint, typecheck and tests.
- **Environment:** `.env.example` files for server, mobile, desktop. Never commit live keys.

### Initial repository layout

```text
apps/
  mobile/          # Expo mobile + tablet
  desktop/         # Electron companion
  api/             # Riot proxy + analysis + realtime server
packages/
  shared/          # types, zod schemas, shared calculations
  ui-tokens/       # colors and typographic tokens
  fixtures/        # anonymized/synthetic Riot match payload samples
docs/
  API.md
  DATA_MODEL.md
  RIOT_POLICY_CHECKLIST.md
  TEST_PLAN.md
```

## 3. Phase-by-phase development plan

### Phase 1 — Project foundation + Riot integration [MVP]

**Goal:** runnable monorepo, API client, mobile navigation and ability to resolve a Riot ID.

**Tasks**
- [ ] Initialize pnpm monorepo, TypeScript, lint/format/test commands, `.env.example`, README.
- [ ] Scaffold Expo with phone/tablet adaptive design and tabs `Matches` / `Live`.
- [ ] Scaffold Electron app with safe `contextIsolation`, `sandbox`, no Node integration in renderer, typed preload bridge.
- [ ] Scaffold backend, health endpoint, structured logging and error handling.
- [ ] Implement server-side Riot Account-v1 Riot ID -> PUUID, correct region routing and rate-limit/backoff handling.
- [ ] Implement Data Dragon champion icons/names and version-aware static data loader.
- [ ] Design player selection flow and persistent local selection; optional accounts deferred.
- [ ] Write Riot policy compliance checklist and required notice/attribution placeholder.

**Acceptance criteria:** API health works; player lookup returns actual Riot data with valid API key (or clearly labeled mock without one); phone/tablet render correctly; desktop starts; no API keys in client bundles.

### Phase 2 — Recent Matches [MVP]

**Goal:** users can fetch, view and open their most recent 20 eligible matches.

**Tasks**
- [ ] Match-v5 match IDs by PUUID; match detail fetching with caching and request budget.
- [ ] Pagination/refresh and clear loading, missing history, invalid Riot ID, rate-limited and offline states.
- [ ] List items: champion, role, queue/mode, result, start date, duration, K/D/A, CS/min (when computable).
- [ ] Detail screen: selected player and match metrics, not a distracting full-lobby table.
- [ ] Stable IDs for matches, type-safe data models, unit tests for parsers.

**Acceptance criteria:** tapping a real match opens its detail and shows accurate participant stats; works on tablet and phone. No invented figures.

### Phase 3 — Match Analysis v1 [MVP]

**Goal:** a useful individual review with factual recommendations, **without an LLM**.

**Tasks**
- [ ] Fetch Match-v5 timeline and normalize participant frames/events with data availability checks.
- [ ] Metrics: KDA, CS/min, KP% (valid team-kill denominator; handle zero), deaths and timestamps, gold/XP trend, CS at 10/15 where frames permit, damage and vision where documented.
- [ ] Compare early/mid/late trends when supported, not exact unobserved last-hit events.
- [ ] Insight engine: rule-based, explainable and confidence-aware; choose 1 positive, 1 area to work on and 1 actionable *future-training* focus.
- [ ] Compare to the player's own last N games with same champion + role + queue when possible; show sample count and avoid false precision. External rank benchmarks only when obtained from a lawful, sound dataset.
- [ ] Never assert causal mechanics not proven by match/timeline stats (e.g. positioning errors) or equate losing with playing badly.
- [ ] Unit tests for no match history, low sample, zero team kills, remakes, unusual game modes, missing timeline fields.

**Acceptance criteria:** reviews are backed by data with explanations, have no made-up claims, and work offline with bundled test fixtures. First usable product milestone.

### Phase 4 — Pre-Match Preparation [Feature 2, first step]

**Goal:** a simple pre-game focus and *personal historical* matchup view; **manual selection first**.

**Tasks**
- [ ] From player history, group prior games by own champion, played role, lane-opponent champion where reliably identified, and queue.
- [ ] Robust lane-opponent inference: use documented position/team information, allow unknown; never silently assume lane opponent when roles ambiguous/swapped. Record sample count.
- [ ] Show difficult matchups ranked by meaningful sample, and label low sample sizes as insufficient evidence.
- [ ] Present `Possible bans to consider` based on player's *past matches*, without auto-banning or pretending matchup stats are universal.
- [ ] Manual inputs for chosen champion, role and optional suspected matchup.
- [ ] Define one static training objective before match from historical analysis.
- [ ] Add `Champion Select Auto-detect` only as optional spike gated on platform support, Riot policy review and approval; if blocked, retain manual workflow.

**Acceptance criteria:** player can choose a champion and see an honest historical pre-match summary; works entirely without undocumented client APIs.

### Phase 5 — Electron Live Companion + Expo second screen [Feature 2]

**Goal:** live, authenticated transmission of supported local stats to a mobile/tablet dashboard.

**Tasks**
- [ ] Electron main process polls selected local Live Client Data API endpoints, preferring subset responses to `/allgamedata`; validate SSL using documented Riot root certificate where practicable; no permanent TLS validation bypass in production.
- [ ] Machine/game state: `unpaired`, `paired`, `waiting_for_game`, `live`, `reconnecting`, `ended`, `error`; game-start and finish detection from supported data and timeouts.
- [ ] Normalize own champion, elapsed time, own K/D/A, CS, CS/min, level, permitted available items/gold and vision fields. `null`/`unavailable` rather than fake zero.
- [ ] Initially show **only own live metrics** and previously selected training focus. Put lane-opponent comparative live fields behind a feature flag pending Riot policy validation; never expose hidden-game data.
- [ ] Pair device with desktop using short-lived QR/one-time code, authenticated sessions, expiring/revocable credentials, encrypted transport WSS, tenant-scoped rooms, replay prevention/rate limiting.
- [ ] Push minimal sanitized events every ~2–5 sec if data changes (configurable), heartbeat and automatic reconnect. Do not send API keys, desktop secrets, complete player roster or unnecessary identifiers.
- [ ] Expo `Live` screen: waiting, connected, live, ended, disconnected; phone compact layout and tablet expanded layout; data staleness indicator.
- [ ] Desktop preferences: start minimized (opt-in), connection status, pairing, disconnect, start/stop collection, diagnostics; avoid CPU-intensive collection.
- [ ] Integration test desktop -> backend -> Expo simulator/device; validate actual Mac and Windows client behavior.

**Acceptance criteria:** in a real match the second screen updates allowed own stats without refreshing; shows disconnected/waiting states correctly; no automatic tactical advice; no exposed credentials.

### Phase 6 — Finish, synchronize & beta readiness

**Goal:** robust transition from live match to post-match report and responsible private/public beta preparation.

**Tasks**
- [ ] Detect end of session; poll Match-v5 with retry/backoff because completed match may appear after a delay; deduplicate by match ID.
- [ ] Show `Match ended — analysis pending` then link to the completed Match Analysis detail.
- [ ] Persist pre-match training focus and evaluate it retrospectively from reliable post-match metrics.
- [ ] QA on supported macOS/Windows versions, iOS/Android phones, iPad/Android tablets, slow Wi-Fi, switching networks and app background/foreground (mobile background updates not guaranteed).
- [ ] Add privacy policy, delete data/pairing controls, logs redaction, consent, Riot notices, accessibility, performance and security checks.
- [ ] Package notarized/signed installers when possible and configure Expo EAS development/distribution builds appropriately.
- [ ] Validate production API access, Riot policies and feature permissions **before open distribution**; disable gated functionality absent approval.
- [ ] Measure UX: time to first match, match-detail open rate, successful desktop pair rate, live session stability, review usefulness feedback.

**Acceptance criteria:** complete paired end-to-end test from opening League to selecting and reviewing a completed match; policy gates are explicit; stable beta builds.

## 4. Priority and sequencing

**Release A (first MVP):** Phases **1–3**: real recent matches + useful analysis on Expo. Publish internally/test with small group, subject to API permissions.  
**Release B:** Phase **4**: manual pre-match prep.  
**Release C:** Phase **5**: Electron live feed to Expo.  
**Release D:** Phase **6**: polish, synchronization, beta.

Build a quick **technical feasibility spike** for Riot live-data access on an actual Mac and Windows computer early in the project, but keep the primary delivery order above. Champion-select detection remains optional.

## 5. Core data contracts (draft)

```ts
type PlayerIdentity = {
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string;
};

type MatchSummary = {
  matchId: string;
  championId: number;
  championName: string;
  role: string | null;
  queueId: number;
  durationSeconds: number;
  startedAt: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  csPerMinute: number | null;
};

type AnalysisInsight = {
  category: 'farm' | 'survival' | 'participation' | 'vision' | 'economy';
  sentiment: 'strength' | 'improvement' | 'neutral';
  headline: string;
  explanation: string;
  evidence: Array<{ metric: string; value: number; unit?: string; comparison?: string }>;
  sampleSize?: number;
  confidence: 'low' | 'medium' | 'high';
};

type MatchReview = {
  matchId: string;
  playerPuuid: string;
  strengths: AnalysisInsight[];
  improvements: AnalysisInsight[];
  trainingFocus: AnalysisInsight | null;
  analysisVersion: string;
};

type LiveSnapshot = {
  sessionId: string;
  sequence: number;
  timestamp: string;
  gameTimeSeconds: number | null;
  championName: string | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  cs: number | null;
  csPerMinute: number | null;
  level: number | null;
  visionScore: number | null;
  dataSource: 'riot-live-client';
};
```

Fields are **draft contracts**, not claims that every field is exposed in every Riot endpoint. Use runtime validation and nullability.

## 6. Suggested backend API (draft)

```text
GET  /health
GET  /v1/players/resolve?gameName=...&tagLine=...&region=...
GET  /v1/players/:puuid/matches?limit=20&cursor=...
GET  /v1/matches/:matchId?puuid=...
GET  /v1/matches/:matchId/analysis?puuid=...
GET  /v1/players/:puuid/champion-insights?championId=...&role=...
POST /v1/pairing/start            # authenticated desktop session
POST /v1/pairing/confirm          # mobile consumes short-lived code
POST /v1/pairing/revoke
WS   /v1/live                    # scoped/authenticated channel
```

Do not expose arbitrary match-history data publicly beyond Riot's permitted privacy and API terms. Use PUUID as stable player key and correctly map Riot routing clusters.

## 7. Core UX screens

**Mobile / tablet (Expo)**
1. First launch: Riot ID + region; permission notice; search.
2. Matches tab: most recent 20 matches, refresh, filter by champion (optional after MVP).
3. Match detail: clear summary, strengths, improvements, *one next goal*, timeline chart where data supports it.
4. Live tab — not paired: QR/code pairing instructions.
5. Live tab — no active match: `Waiting for League of Legends match` + optional pre-match focus.
6. Live tab — active: player/champion portrait, large CS/min, KDA, session timer, small supporting stats and training goal. Tablet: wider 2-column layout; phone: vertical cards.
7. Pre-Match: select champion and role, past difficult matchups, sample size, possible ban consideration.

**Desktop (Electron)**
1. Pair code / QR, connected mobile status.
2. Connection and League game-detection status.
3. Minimized tray/menu-bar mode as available, privacy and disconnect controls.
4. Diagnostics view (redacted logs, no credentials).

## 8. Practical coaching rules (starting examples, must be validated)

- CS/min = total minions/monsters killed divided by game duration in minutes; distinguish jungle CS where relevant.
- KP% = (kills + assists) / team's total kills × 100; when team kills = 0, return `null`, not `0%`.
- Prefer same-champion, same-role, same-queue historical baseline; don't call a player 'bad' from one low metric.
- A claim like "farm declines after 15 minutes" requires timeline evidence, not final CS/min alone.
- `one next focus` chooses among well-supported, low-noise deficits. Include concrete, non-tactical practice goals for future matches.
- Comparisons against a lane opponent must tolerate role swaps, unclear opponents, insufficient matches and policy restrictions. Never assert known opponent behavior from unavailable data.

## 9. Security, legal, platform checklist

- [ ] Riot API keys only on backend; request budget, exponential retry/backoff for 429/5xx.
- [ ] HTTPS/WSS, pairing token expiry, rotation/revoke, authenticated device/session association.
- [ ] Validation of all incoming snapshots; size limits, sequence numbers, schema versions, throttling.
- [ ] Electron `contextIsolation: true`, renderer Node integration off, tight preload API, controlled navigation and web contents.
- [ ] Verify Riot game client TLS certificate using documented certificate/root approach; never silently disable SSL checks for release.
- [ ] No memory scanning, input automation, illegal overlays, hidden-information inference or circumventing anti-cheat.
- [ ] Explicit app disclaimer and intellectual property policy compliance.
- [ ] No official Riot login until RSO access is approved; use Riot ID search initially.
- [ ] Keep raw live telemetry minimal and preferably ephemeral; user deletion and retention controls.
- [ ] Test mobile background/lock behavior; foreground second-screen experience is the baseline.

## 10. Work instructions to Claude Code

1. Read this entire roadmap and produce a brief technical plan for **Phase 1 only**.
2. Implement Phase 1 in the actual repository. Use supported stable package versions and verify current official library documentation.
3. Keep code modular; no unnecessary abstractions, no hardcoded fake data disguised as production data.
4. Add a `DEVELOPMENT_PROGRESS.md` file with phase checklist and updates after each phase.
5. Run and report lint, TypeScript checks, unit tests and app startup checks. Correct errors before proceeding.
6. Use real Riot API only when credentials are provided; otherwise include explicitly labeled fixtures and an injectable mock adapter.
7. **Do not proceed automatically to the next phase** until the current phase has verifiable acceptance criteria and the user instructs you to continue.
8. When Riot rules or API access are uncertain, explain the blocker, implement safe/manual fallback, and clearly mark any feature gated behind approval.

### First prompt to Claude

> Use `LOL_PERSONAL_PERFORMANCE_ROADMAP.md` as the source of truth. Set up **Phase 1** for an Expo React Native mobile/tablet app, Electron desktop companion, and Node TypeScript API in a pnpm monorepo. Establish shared types, Riot ID lookup through server-side integration, mobile navigation, and secure Electron scaffolding. Create developer setup instructions and `DEVELOPMENT_PROGRESS.md`. Do not implement other phases yet. Run tests/typecheck and report exactly what works, what needs API credentials, and what remains to do.

## 11. Official reference links (recheck before implementation)

- Riot developer documentation: https://developer.riotgames.com/docs/lol
- Riot API browser: https://developer.riotgames.com/apis
- Riot developer policies: https://developer.riotgames.com/policies.html
- Expo documentation: https://docs.expo.dev/
- Expo development builds: https://docs.expo.dev/develop/development-builds/introduction/
- Electron security: https://www.electronjs.org/docs/latest/tutorial/security

---

**Definition of success:** A player searches their Riot ID in the Expo app, taps their latest match, receives a trustworthy and easily understood individual review, optionally prepares a personal training objective before a game, and later pairs an Electron companion to view permitted live stats on a mobile/tablet second screen. Two main features. No unnecessary complexity.
