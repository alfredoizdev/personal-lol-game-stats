# Development progress

Source of truth for scope: `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md`.

## Phases

- [x] Phase 1 — Foundation (monorepo, shared package, Electron collector, Expo app with login and tabs) — code complete 2026-10-21; credentialed acceptance pending (see below)
- [ ] Phase 2 — Recent Matches
- [ ] Phase 3 — Match Analysis v1
- [ ] Phase 4 — Live companion
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
