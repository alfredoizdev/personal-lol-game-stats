# Development progress

Source of truth for scope: `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md`.

## Phases

- [ ] Phase 1 — Foundation (monorepo, shared package, Electron collector, Expo app with login and tabs)
- [ ] Phase 2 — Recent Matches
- [ ] Phase 3 — Match Analysis v1
- [ ] Phase 4 — Live companion
- [ ] Phase 5 — Pre-match focus
- [ ] Phase 6 — End-of-game sync, QA, beta readiness

## Phase 1 tasks

Plan: `docs/superpowers/plans/2026-10-21-phase-1-foundation.md`

- [x] Task 1 — Monorepo skeleton + `packages/shared`
- [ ] Task 2 — League detection modules (copied from RiftLens)
- [ ] Task 3 — Electron shell with status bridge and tray
- [ ] Task 4 — Supabase session in the main process
- [ ] Task 5 — Expo app with sign-in and sign-up
- [ ] Task 6 — Riot ID link screen and the two tabs
- [ ] Task 7 — Phase 1 acceptance and progress report

## Log

- 2026-10-21 — Task 1 done. `@lpp/shared` with `parseRiotId`, regions, `LeagueStatus` types, Riot disclaimer. 8 tests green.
