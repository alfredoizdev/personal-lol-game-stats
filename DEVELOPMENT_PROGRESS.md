# Development progress

Source of truth for scope: `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md`.

## Phases

- [x] Phase 1 — Foundation (monorepo, shared package, Electron collector, Expo app with login and tabs) — code complete 2026-10-21; credentialed acceptance pending (see below)
- [x] Phase 2 — Recent Matches — code complete 2026-10-21, verified with real data
- [x] Phase 3 — Match Analysis v1
- [x] Phase 4 — Live companion
- [x] Phase 5 — Pre-match focus — code complete 2026-10-22; owner acceptance (saved goal → live → review) pending
- [x] Phase 6 — Performance page — code complete 2026-10-22; owner acceptance on device pending
- [x] Phase 7 — Riot submission package — code complete 2026-10-22; owner steps pending (EAS build + push acceptance, site deploy, legal entity review)
- [x] Phase 8 — Live: client phase, in-game events, in-app alerts, back to Prepare — code complete 2026-10-22; owner acceptance on device pending
- [ ] Phase 9 — end-of-game sync / QA / installer

## Phase 1 tasks

Plan: `docs/superpowers/plans/2026-10-21-phase-1-foundation.md`

- [x] Task 1 — Monorepo skeleton + `packages/shared`
- [x] Task 2 — League detection modules (copied from RiftLens)
- [x] Task 3 — Electron shell with status bridge and tray
- [x] Task 4 — Supabase session in the main process
- [x] Task 5 — Expo app with sign-in and sign-up
- [x] Task 6 — Riot ID link screen and the two tabs
- [x] Task 7 — Phase 1 acceptance and progress report

## Phase 2 verification (2026-10-21)

Plan: `docs/superpowers/plans/2026-10-21-phase-2-recent-matches.md`. Screenshot: `docs/screenshots/phase2-matches.png`.

Verified with the owner's account and a renewed dev key:
- Matches tab lists real games (champion, role, K/D/A, KDA ratio, CS/min, duration, time ago, items) with the "Last 10 Games" header (Avg KDA, CS/min, Win Rate).
- 10 games first, +5 per scroll-to-end; only the visible window fetches `match-detail`; at most 4 detail calls in flight.
- Match Review opens from a row: hero card, four stats, Lane Matchup (you vs lane opponent) — confirmed by the owner.
- Expired-key state shown correctly (`KEY_INVALID` → "Riot key expired" + renewal hint) before the key was renewed.
- Identity: the owner's linked account stores the LCU 36-char uuid; `summarizeMatch` now falls back to Riot ID (gameName#tagLine) so matches resolve.
- Tab bar with icons (Matches / Live / Profile), centered, bottom safe-area inset for Android nav bars.
- `pnpm -r test`: shared 42, desktop 42, mobile 56. Typecheck and lint clean. No `RGAPI-` in sources.

Riot budget: list = 1 `match-list-ids` (90 s server cache) + ≤10 `match-detail` on first paint (+5 per page); every detail is cached forever in `match_details_cache`, so reopening a match costs 0 Riot calls.

Limitations: no timeline, no analysis chips or "Needs work" (Phase 3); no champion filter; Android layout not yet run on a device/emulator (insets handled, visual check pending).

## Phase 1 verification (2026-10-21)

Environment: macOS 26.6.2, Node 26.3.1, pnpm 10.33.0, Expo SDK 58.0.16, Electron 45.0.0, iPhone 17 simulator.

Verified in this session:
- `pnpm -r test`: shared 23, desktop 42, mobile 42 — all green. `pnpm -r typecheck` and `pnpm -r lint` clean.
- No `RGAPI-` string in sources, in the desktop renderer/main bundles, or in the iOS Hermes bundle. No `service_role` in the renderer bundle. The Supabase anon key lives only in `.env` files (git-ignored) and in the main process.
- Desktop: `pnpm --filter @lpp/desktop dev` starts, logs `auth: signed-out`, does not start the League detector until signed in. With the detector running (pre-auth build) it logged CLOSED → STARTING → CLOSED when League was launched.
- Mobile: `expo export --platform ios` bundles (1388 modules); simulator renders the Sign in screen with the Riot disclaimer.

Pending (needs the product owner's Supabase credentials and a League session):
- Desktop sign-in → `Connected as Name#TAG` with League open from the Riot Client, and session persisting across relaunch.
- Mobile sign-in → link Riot ID → Matches tab; relaunch lands on Matches; iPad layout check.
Commands: `pnpm --filter @lpp/desktop dev` and `pnpm --filter @lpp/mobile ios`.

Limitations: macOS only. Matches and Live tabs are placeholders; Profile is functional (list, add and switch Riot accounts, sign out, delete account). Removing a linked account needs a `delete` RLS policy (migration pending). No Riot match data yet (Phase 2). Live Client certificate is not validated (loopback, as in RiftLens).

## Log

- 2026-10-21 (evening) — Product renamed LanePulse; sign-in/sign-up rebuilt to mockups 09–10 (remember me, forgot password, username + optional Riot ID + region at sign-up, applied on first signed-in launch); real logo and generated app icons; desktop renderer moved to the navy/violet palette.
- 2026-10-21 (later) — Visual direction switched to mockups 06–08 (navy + violet palette in tokens). Profile tab added with multi-account support.
- 2026-10-21 — Tasks 1–7 done. Phase 1 code complete; see verification section.
- 2026-10-21 — Task 1 done. `@lpp/shared` with `parseRiotId`, regions, `LeagueStatus` types, Riot disclaimer. 8 tests green.

## Phase 4 verification (2026-10-22)

Plan: `docs/superpowers/plans/2026-10-21-phase-4-live.md`. Screenshots: `docs/screenshots/phase4-live.png`, `docs/screenshots/phase4-live-trend.png`.

Verified with the owner's account:
- Real game (owner on Caitlyn/Samira, bot lane): desktop logged `In game as <champion> · m:ss` every 2 s; the phone's Live tab showed LIVE badge, timer, You vs lane opponent (Tahm Kench), Lane Matchup with CS lead chip and comparison bars, KP / Vision / Level tiles, CS/min trend; at the end it showed ENDED with "Match ended → Go to Matches".
- While queueing the desktop shows "Searching for a match…", then "Champion select", "Loading into the game…".
- Vision score arrives from the Live Client API as a long float (13.0152835…); it is rounded in the collector and in the tile.
- Snapshots older than 10 minutes (ended or stale) are forgotten and the tab returns to "Waiting for a match".
- Payload check: the broadcast carries only `LiveSnapshotV2` (champion names, position, level, K/D/A, CS, CS/min, vision score, item ids, team kills, game time, queue, focus). No token, email, puuid or roster leaves the desktop. Channel is the public broadcast `user:<userId>` (private channels deferred to Phase 6).
- Desktop is now a menu-bar app: tray icon from the logo, closing the window hides it, Quit from the tray menu, no Dock icon.
- Dev-only DEMO feed (`LPP_LIVE_DEMO=1`, never in packaged builds) runs without League open so the pipeline can be exercised offline. Never run it while League is open.
- Navigation fix found during this phase: Expo Router 58 hidden tabs (`href: null`) bounce navigation, so Match Review moved into a nested stack under the Matches tab (`(app)/(tabs)/matches/[matchId]`); tapping a row now opens the review.
- `pnpm -r test`: shared 62, desktop 54, mobile 71. Lint and typecheck clean. No `RGAPI-` / JWT / service_role in sources.

Riot budget unchanged: live data comes from the local Live Client API (no Riot Web API calls).

## Phase 3 verification (2026-10-22)

Plan: `docs/superpowers/plans/2026-10-22-phase-3-analysis.md`. Spec: `docs/superpowers/specs/2026-10-22-phase-3-analysis-design.md`. Formula: `docs/ANALYSIS.md`. Screenshots: `docs/screenshots/phase3-review-{overview,farming,lane,combat}.png`, `phase3-how-scored.png`.

- Match Review now shows an overall score with a headline, four area pills (Farming · Combat · Vision · Lane) and the selected area's card: semi-donut 0–100, rating word, one sentence with the concrete number and its reference, sub-rows with score bars and "vs opponent" / "vs you (n games)" deltas, plus the CS-over-the-game curve (phases marked, weakest shaded) for Farming and the gold-lead chart for Lane. "Full lane comparison" is collapsed below, every row with the two-sided share bar. "How it's scored" opens the targets, curves, weights and baseline for the match's role.
- Verified on the owner's real game NA1_5664855818 (Syndra bot, 42 min, Normal Draft): overall 44 Fair, Farming 20 / Combat 70 / Lane 52 / Vision 39; sentence "Slow late game: 3.4 CS/min vs 5.6 for your opponent (25+ min)."; baseline n = 9.
- `match-timeline` deployed to the shared project (migration `20261022000001_match_timeline_cache` applied). Verified with curl: first call `X-Cache: MISS` (2.2 s), second `HIT` (0.8 s), 8.8 KB / 44 frames. Riot budget per first review: 1 timeline call (+ up to 10 detail calls for the baseline, cached forever).
- Engine cases covered by tests: ARAM / bots / remakes not analyzed with a reason; support (Farming not scored, Lane gold+XP); no timeline; no lane opponent; team with 0 kills; 9-minute game; baseline with 0/1/2 games; the worked example in `docs/ANALYSIS.md`.
- `pnpm -r test`: shared 105, desktop 60, mobile 86. Lint and typecheck clean. No `RGAPI-` / JWT in sources.
- Owner acceptance still pending on device: tap the pills, expand the lane comparison, and open a fresh game (timeline fetched live) and an ARAM (reason shown).

## Phase 5 verification (2026-10-22)

Plan: `docs/superpowers/plans/2026-10-22-phase-5-prematch.md`. Spec: `docs/superpowers/specs/2026-10-22-phase-5-pre-match-design.md`.

- Live tab, no game running: "Prepare your next game" — role chips, champion picker (Data Dragon list with search, your champions in that role first with game counts), your record with that champion (games, win rate, KDA, CS/min; honest about few games), a personal goal editor (CS/min · vision score/min · deaths per 10 min · kill participation, stepper, default = your average with that champion ≥ 3 games → your role average → the role target, source stated) saved per Riot account, and "Toughest matchups" by role with a ban sentence only when you lost ≥ 3 games against one champion under 40 %.
- Own history: up to 100 games, loaded only when the player presses "Load your last 100 games", in chunks of 20 through the 4-wide limiter with progress; cached games are used immediately.
- Live hero shows "Personal goal: 7.0 CS/min · On track / Below goal / —" for the champion being played (name → id via Data Dragon), falling back to the newest goal for the role.
- Match Review shows "Your goal: … → you did … (met/missed)" in the area that owns the metric, using the goal in force when the game ended.
- `pre_match_focus` table applied to the shared project (append-only rows, RLS own).
- Verified in the simulator with temporary launch hacks (no synthetic taps: other windows covered the simulator): role chips, picker (fixed to a page sheet after the owner found its header under the status bar), summary, goal editor, matchups, backfill bar. Owner acceptance pending: save a goal, play a game with the collector open, see it live, then in the review.
- `pnpm -r test`: shared 130, desktop 60, mobile 109. Lint and typecheck clean. No secrets in sources.

## Phase 6 verification (2026-10-22)

Plan: `docs/superpowers/plans/2026-10-22-phase-6-performance.md`. Spec: `docs/superpowers/specs/2026-10-22-phase-6-performance-design.md`. Aggregates: `docs/ANALYSIS.md` section 8. Screenshots: `docs/screenshots/phase6-performance-{overview,champions,matchups}.png`, `phase6-matches-header-donuts.png`.

- New Performance tab (Matches · Live · Performance · Profile) computed only from the player's own cached games (the Phase 5 backfill, "n of 100 games loaded" + button), fixed to the last 20 games at the owner's request (no period picker); Overview (average match score as a semi-donut with the tier, W–L record, streak, last-10 bars); Where you are strongest (per-role games, win rate, mean score bar; strongest/weakest only with ≥ 3 games); What holds you back (Farming / Combat / Vision mean scores with sub-row averages vs the mean role target; Lane excluded, needs the timeline); Your champions (most played, record, role, tier); Lane matchups over every loaded game (You lose to < 50 % / You beat > 50 %, ≥ 2 games, grouped by enemy champion and role; a repeat opponent is rare inside 20 games).
- Also merged here: the Matches header now draws Avg KDA / CS/min / Win rate as semi-donuts with a rating word (`docs/ANALYSIS.md` section 9).
- No new Riot calls, Edge Functions or desktop changes. Copy is descriptive only.
- Engine cases covered by tests: empty; ARAM/remakes excluded; period larger than loaded; recent order and cap; streak 1 / 3 / 10; single rankable role; support without Farming; weakest area needs 3 games; champion limit 8 with most-played role; matchups needing 2 games, same role only, limits 5/3; headline.
- Verified in the simulator with temporary launch hacks (redirect + auto-start + scroll, reverted) on the owner's account: 100 games loaded, overview 47 "5+ · Needs Work", Mid 60 % / Bot 30 %, Farming weakest (5.5 CS/min vs 7.3 target), 8 champions, matchups over 98 games. The owner reviewed the first version on device and asked for the leaner overview and the fixed 20-game window (done). Acceptance of the final layout pending.

## Phase 7 verification (2026-10-22)

Plan: `docs/superpowers/plans/2026-10-22-phase-7-riot-submission.md`. Spec: `docs/superpowers/specs/2026-10-22-phase-7-riot-submission-design.md`. Riot package: `docs/riot/{application,call-budget,deletion,build}.md`.

- Legal text once in `packages/shared/src/legal.ts` (Terms 10 sections, Privacy 11; no TBD; entity marked for review), rendered into the static site `apps/site` (`node build.mjs` → `dist/`, Vercel-ready, disclaimer on every page) and into `/legal/terms` and `/legal/privacy` in the app (outside the auth group, pushed from the sign-up checkbox links so the form keeps its values). Sign-up stores `accepted_legal_version`; Profile → Legal shows it.
- Migrations applied to the shared project: `lanepulse_push_tokens`, `notification_prefs`, Realtime Authorization policies for the private topic `lanepulse:<uid>`.
- Live channel renamed and private on both ends (`liveTopic(userId)`); verified with the demo feed (`docs/screenshots/phase7-live-private-channel.png`).
- Goal notifier engine (pure, shared): first status after 60 s, change/interval modes, 60 s gap, one final. Desktop `createGoalPush` reads prefs/tokens/goals/linked accounts under RLS and posts to Expo; revokes dead tokens; never blocks the poller.
- Mobile: lazy `expo-notifications` registration (skipped in Expo Go and simulators), Profile → Notifications (switch, two cadence rows, "Status only — never tips."), tap routing that ignores non-LanePulse payloads, `eas.json` profiles, delete-account dialog lists what is removed.
- Tests: shared 181, desktop 73, mobile 156, site 1. Lint and typecheck clean. No secrets.
- Final review fixes: token-ownership trigger (a shared phone never receives another account's pushes), push registration follows the Notifications toggle (no OS prompt unless asked), the desktop processes a state that arrives mid-send (the final at game end), call budget corrected to the code (up to 100 req in a 10 s window once per account).
- Owner steps (not blocking merge): `eas init` + development build on a device, one real game with the toggle on, `vercel deploy` of `apps/site`, legal entity and regions review before submitting (`docs/riot/application.md` checklist).

## Phase 8 verification (2026-10-22)

Plan: `docs/superpowers/plans/2026-10-22-phase-8-live-events.md`. Spec: `docs/superpowers/specs/2026-10-22-phase-8-live-events-design.md`.

- Live follows the whole session: phase card from the desktop's `live-phase` broadcasts (in lobby, searching with a queue timer, match found, champion select, loading), alert cards at the top (goal flips, kills, deaths with the respawn time, multikills, objectives, structures, match found; max 3, 5 s, tap to dismiss), the hero greys a dead portrait with the respawn countdown, a Game events feed as the client shows it, and after the final snapshot the screen returns to Prepare (client left the game or 60 s) with a compact Last-match card.
- Snapshot stays v2 with optional `isDead`/`respawnSec`/`events` (defaults when an older desktop omits them); no new Riot calls (events come from the same `allgamedata`), no new native modules (the Phase 7 development build keeps working).
- Push banners are silenced while the app is in the foreground; background push unchanged.
- Also in this phase at the owner's request: the goal editor starts at the recommended role target with the player's own average beside it; Prepare loads its 100-game window by itself; Save goal shows a lasting confirmation.
- Tests: shared 209, desktop 75, mobile 167, site 1. Lint and typecheck clean.
- Pending: simulator pass with the demo session (League was open on the owner's Mac during the build) and the owner's device acceptance of the alerts and the death countdown in a real game.

## Prepare by role (2026-10-23)

Design note: `docs/superpowers/specs/2026-10-23-prepare-by-role-design.md`. Owner feedback after Phase 8 device testing.

- Prepare no longer asks for a champion or a role: it shows your most played role by itself (the role icons only let you look at another), with your record, toughest matchups and ban note for it, and ONE goal set with the existing editor. The goal is stored as a standing goal, "recommended for the role you play" unless moved to a fixed number. The separate "Save for every game" block is gone.
- In champion select the card follows the assigned role and the locked champion from the player's own cell (headline "Playing Zed · Mid").
- Also: the Game events feed is hidden once the match has ended (PR #3).
- Tests: shared 220, desktop 82, mobile 183, site 1. Lint and typecheck clean.

## History loaded once, launch loading screen (2026-10-23)

Owner feedback: "a loading screen while the games load, and load them once at start for every page, not each time I enter a screen".

- `HistoryProvider` in the app layout mounts the own-history hook once per account and starts the 100-game window as soon as the id list is known; `useHistory()` replaces per-screen `useOwnHistory` calls in Performance and Prepare (no screen starts a load on entry any more; Retry remains).
- `LoadingScreen` holds the tabs until EVERY game in the window is loaded (owner: no numbers moving on screen once inside; a first cut opened the tabs after 20 and Live kept shifting). Never blocks on nothing (no games or a run that stopped short shows the tabs, which explain and offer Retry); sticky per account so a later refetch never flashes it.
- Tests: mobile 187 (`app-load.test.ts`). Lint and typecheck clean.

## Fix: launch load really holds the tabs; support always has a goal (2026-10-23)

Owner report: the tabs still opened while the 100 games loaded, and Prepare showed no goal as support.

- Cause 1: in the render between the id list arriving and the run starting nothing was running yet, so the load state read "stopped short → ready" and stuck (sticky). `appLoadState` now takes `started`; until the launch run has started it stays 'loading'. Regression test added.
- Cause 2: a "recommended for the role you play" goal on CS/min resolved to nothing for support, where farming is not scored. `goalFor` now falls back to the role's own first metric (`defaultMetricFor`: vision for support, CS elsewhere), so a support game gets the recommended vision goal; a fixed number set by the player still applies as set. The editor shows that fallback as a plain value (no stepper) with an explanation, and Save keeps "recommended".
- The role tapped in Prepare is remembered on the device (champion select still overrides).
- Tests: shared 223, desktop 82, mobile 190. Lint and typecheck clean.

## Live alert cards made noticeable (2026-10-23)

Owner: the event cards on Live were tiny and sat under the iPhone's status bar / Dynamic Island. The overlay is absolutely positioned so the safe-area padding never reached it: it is now offset by the top inset. Cards are larger (icon badge, 2 px tone border, bigger type, shadow) and stay 7 s. Mobile 190 tests, lint and typecheck clean.

## Champion select screen (2026-10-23)

Design note: `docs/superpowers/specs/2026-10-23-champ-select-screen-design.md`. Owner request; meta bans via option 1 (curated list in the repo).

- The phone opens a modal screen on the transition into champion select, closes it when the phase leaves (the game loads → Live as before), and does not reopen a champion select the player dismissed.
- For the assigned role (own cell): bans from your games (lane opponents you lost to most, W–L, win rate, sentence form), the curated meta ban list with its `updatedOn` date (`packages/shared/src/prematch/meta-bans.ts`, update by hand each patch), your picks (best win rate with 3+ games, then most played, with KDA and CS/min). Once a champion is locked: your record on it in that role and the goal that will apply.
- Pure helpers tested: `recommendedPicks`, `metaBansFor` (shared), `champSelectNavigation` (mobile). Riot application text updated (own cell only, statements not orders).
- Tests: shared 226, desktop 82, mobile 196. Lint and typecheck clean.

## Post-game screen (2026-10-23)

Design note: `docs/superpowers/specs/2026-10-23-post-game-screen-design.md`. Owner request (the second screen after champion select).

- Opens by itself when a game ends (new `endedAt` from the final snapshot), closes when the next queue or game starts, not reopened once dismissed. Shows the last snapshot (portrait, K/D/A, CS/min, stat tiles) and whether the goal was met.
- Finds the review: refreshes the Matches id list every 20 s until the newest match is this game (`isReviewOf`), then Victory / Defeat and "Open the match review"; gives up after 6 min and points to Matches.
- Tests: mobile 201 (`post-game.test.ts`). Lint and typecheck clean.

## Instant launch: the match cache survives a restart (2026-10-23)

- `PersistQueryClientProvider` + AsyncStorage persister (`@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, both 5.104.5, pure JS, no native module). Only match details, the two id lists and the champion list are persisted (`shouldPersistQuery`); goals and the linked account come fresh from Supabase. Max age a week; writes throttled to 3 s.
- Launch: the cache restores before the first query; the restored id list refreshes once and the launch screen waits for that refresh, so only games played since the last launch download. With nothing new, the tabs open at once.
- Tests: mobile 204 (`query-persist.test.ts`). Lint and typecheck clean.
- Post-game screen (owner, 2026-10-23, first real game): the owner wanted their lane there too — the screen now shows the same me-vs-opponent table as Live (final scoreboard numbers from the last snapshot) between the goal card and the match review.
- Champion select redesign (owner, 2026-10-23, after the first real game: "ahora solo parece listas"): three picks on top as a big swipeable carousel (`champSelectPicks`: best win rate with 3+ games, filled with the most played; win rate, W–L, KDA, CS/min per card), then six bans as tiles (`champSelectBans`: three lane opponents you lose to, three meta champions not already listed). Once the champion is locked the record card replaces the carousel. Old list components removed.
- Post-game screen: a "Your numbers" grid (KDA, kill participation, CS/min with total, vision, level, damage + gold once the match record arrives, items) replaces the three tiles; the hero line shows champion, role and queue. Tests: shared 230 (`champ-select.test.ts`), mobile 204.
- Phase 9 (partial, 2026-10-26): desktop companion packaged with electron-builder (`pnpm dist` → `release/LanePulse-0.1.0-arm64.dmg`, ad-hoc signed, runs without the dev servers; smoke run: signs in, connects, polls League). Owner asked for it after running `pnpm dev` by hand. Notarized Developer ID build and an app icon remain. See `docs/desktop/install.md`.

- Match review hero (owner, 2026-10-26): the "Played · 40m ago" column removed; KDA, CS/min and Duration remain.
- Goal by role (owner, 2026-10-26: "los goals deberían cambiar según el rol"): "Recommended for my role" is now per role — the metric where the player is furthest below the role target in their last 20 games as that role, else the role's first metric (jungle → kill participation, support → vision, lanes → CS). A fixed metric and number still applies to every role (CS for support keeps the recommended goal). Save writes the standing row plus one row per role so Live, the review and the desktop push agree; a newer role-wide row beats an older champion-specific one. Spec `docs/superpowers/specs/2026-10-26-goal-by-role-design.md`. Tests: shared 240 (`goal-recommend.test.ts`), mobile 202, desktop 82.
- Goal editor simplified (owner, 2026-10-27, on the simulator: "hay que hacerlo más sencillo … el user escoge el goal"): the five-role list is gone. Four metric chips, one number line for the role shown (recommended = that role's target; moved = your number for every role), a one-line "your weakest as support: kill participation, 47 % over 20 games — tap to pick it" suggestion, Save right below, the reference ruler last. Save still writes one row per role (the chosen metric at each role's target; the recommended goal where the metric is not scored). Mobile 204, shared 240.

- Loading screen (owner, 2026-10-27: "el cliente demora en cargar la partida y la app dice disconnect"): the desktop poller now reports InProgress-without-snapshot as a waiting phase (the loading screen) and holds the queue state through brief LCU stalls while the game client launches; the phone shows a spinner "Loading into the game…" on the Live tab and closes the champ select screen at that point. Desktop 84, shared 242, mobile 204. Packaged companion rebuilt (`pnpm dist`).
- Best role mark (owner, 2026-10-27, on the simulator: "un indicativo de cuál es el mejor rol que juego"): `bestRole` = highest win rate among roles with 5+ games (ties to more games); a green ★ on that role chip and one sentence in the Prepare line ("★ Support is where you win most: 64 % over 28 games"). Shared 242, mobile 204.
- Post-game screen (owner, 2026-10-27): full screen, no tab bar, no close or swipe-down; once Riot lists the game it shows "Your match review is ready. Opening it…" for 3 s and moves to the match review by itself (`postGameRedirect`); the next queue still closes it; after 6 minutes without a listing it offers Matches. Mobile 205.
- Ranked apart from normals (owner, 2026-10-27): All · Ranked · Normal chips on Matches (list + Last 10 donuts) and Performance (100-game window), one choice saved on the device (`lpp.queueFilter`); every match row shows its queue tag ("Ranked · 9h ago"). Ranked = Solo/Duo + Flex; Normal = Draft, Blind, Swiftplay, Quickplay; ARAM and the rest stay as before. Prepare and champ select keep all Summoner's Rift games. Shared 247 (`queue-filter.test.ts`), mobile 205.
- Rank (owner, 2026-10-27: "no sale el MMR por ningún lado"): Riot exposes no MMR, so the app shows the league-v4 standing — "Solo/Duo Gold II · 45 LP · 12W 8L · Flex …" under the Riot ID on Matches, and the player's Solo/Duo tier ringed on the goal ruler. New Edge Function `ranked-entries` (platform routing, no server cache; the phone keeps it an hour and persists it). Deployed by the owner from the RiftLens repo. Shared 250 (`rank.test.ts`), mobile 207.

- Rank fix (2026-10-27, simulator): the function returned 400 because LanePulse stores the LCU 36-char UUID as the account puuid, which the Web API cannot decrypt; `ranked-entries` now resolves the encrypted puuid from the Riot ID through `riot_account_cache` → ACCOUNT-V1, like `match-list-ids`. Redeploy needed.

- Matches header (owner, 2026-10-27: "remueve ese título tan grande, usa las imágenes png para el elo"): the "My Matches" title and "Recent performance" line are gone; the header is Riot's emblem PNG for the Solo/Duo tier, the Riot ID, the tier name ("Gold III") and "45 LP · 14W 25L · 36% win rate", Flex as a muted line when it exists, avatar → Profile on the right. `RankHeader` component, `rankCard` in shared (`rank.test.ts`). Shared 251, mobile 207. Deployed `ranked-entries` v2 (the v1 on the server was why the rank never showed).

- Matches, op.gg-style (owner, 2026-10-27: "que tal algo así" + "ok haslo"): profile block (avatar with the summoner level pill, name, Riot ID · region), two rank cards — Ranked Solo / Ranked Flex, each with the emblem PNG, tier, LP and "14W 25L (36%)", Flex only when the player has a Flex entry — and match rows with a W/L strip carrying the duration, deaths in red, a "K/P 54%" line, queue and time ago on the right. `ranked-entries` also calls summoner-v4 for the level (redeploy needed); `rowMeta` in `match-row-view.ts`. Spells/runes per row, past seasons and an MMR estimate were left out (not in the summary / not in Riot's API). Shared 252, mobile 209.

- Performance, op.gg-style (owner, 2026-10-27: "muy busy, no fácil de leer, tampoco hay comparativas" → "ok haslo lo que recomiendes"): the tab is now four lean cards — Recent 20 games (record, K/D/A with deaths in red, KDA ratio, three most played champions with win rate, main position share), You vs <tier> (your averages in your most played role next to the typical value for your Solo/Duo tier, two bars and a signed gap per metric, the weakest flagged; Gold when unranked; one caption says the tier values are community estimates), Roles (one line each, ★ on the role you win most) and Champions (top 5 with games, win rate, KDA). Gone: the avg-score gauge, the last-20 / best-worst / on-target row, the 10-bar strip, "What holds you back" and the matchups card. Per-rank ladder recalibrated on real data (mid CS 5.4 → 7.6, jungle CS own ladder, KP 41 → 49, vision by role) so the goal ruler and the comparison agree (docs/ANALYSIS.md 5b). New shared `performance/snapshot.ts`, `performance/compare.ts`, `kda` on ChampionStat. Shared 261, mobile 203 (six helper tests retired with their cards).

- LP per game (owner, 2026-10-27: "sí hay que mostrar el LP"): Riot's match data carries no LP, so the phone stores the player's own league-v4 standing every time it reads it and it moved (`rank_snapshots`, RLS own, migration `20261027000001`); between two snapshots whose season record grew by exactly one game, the LP difference goes to the one ranked game of that queue that ended in between — "+18 LP", "−15 LP", "+25 LP · ↑ Gold II" on the Matches row (`packages/shared/src/lp-changes.ts`). The post-game screen re-reads the standing as soon as the review is found; the rank is otherwise re-read every 15 min. Only games from now on get a value; several games between two readings are left blank rather than split. Needs `supabase db push` from the RiftLens repo (owner). Also, on device feedback ("esto no se entiende"): the "Recent 20" block is two cards — "Last 20 games" with the same two arcs as the Matches header (win rate and KDA, rating word, one plain line under each: "7 wins · 13 losses", "kills + assists per death") and "Mostly Jungle · 10 of 20 games"; "Champion pool" with one row per champion (games, W/L, win rate) — and roles/champions rows read "1W 2L · 33% win rate" with "★ the one you win most" under the title. The K/D/A-per-game numbers are gone (KDA was shown twice). Shared 268, mobile 206.

- LP hint (owner, 2026-10-27: "¿dónde está el LP?"): while no listed ranked game carries an LP value, a line under "Recent Games" says "LP per game starts with your next ranked game played with LanePulse open." (`lpHint` in `match-row-view.ts`). Mobile 207.
