# Development progress

Source of truth for scope: `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md`.

## Phases

- [x] Phase 1 — Foundation (monorepo, shared package, Electron collector, Expo app with login and tabs) — code complete 2026-10-21; credentialed acceptance pending (see below)
- [x] Phase 2 — Recent Matches — code complete 2026-10-21, verified with real data
- [x] Phase 3 — Match Analysis v1
- [x] Phase 4 — Live companion
- [ ] Phase 5 — Pre-match focus
- [ ] Phase 6 — End-of-game sync, QA, beta readiness

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
