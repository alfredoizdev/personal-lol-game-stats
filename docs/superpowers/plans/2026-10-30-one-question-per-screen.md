# One question per screen — implementation plan

> Inline execution (owner: "sí, hazlo según tu recomendación", 2026-10-30). One PR per task so the owner can test each screen on device. TDD for every pure function; removals verified by tsc + eslint + both suites.

**Spec:** docs/superpowers/specs/2026-10-30-one-question-per-screen-design.md

## Task 1 — Match Review: Takeaways (PR "one-question-review")
- `packages/shared/src/analysis/takeaways.ts`: `takeaways(analysis: MatchAnalysis, goal: {text, met} | null): Takeaway[]` where `Takeaway = { kind: 'best'|'worst'|'goal'; label: string; value: string; compare: string | null; tone: 'good'|'bad'|'plain' }`. Test first (`packages/shared/tests/takeaways.test.ts`): best/worst from all scored non-context subrows; single scored row → best only; compare precedence rival → you → target; lane rows compare null; goal row from goalLine; not analyzable → [].
- `apps/mobile/src/components/TakeawaysCard.tsx`; `[matchId].tsx` drops AreaPills/AreaCard/charts/LaneMatchupCard; delete the orphaned components + their tests (`AreaCard`, `AreaPills`, `SubrowBar`, `CsCurveChart`, `GoldDiffChart`, `LaneMatchupCard`, `lib/area-ui.defaultArea` if unused).
- `post-game.tsx` drops PostGameStats + LiveMatchupTable (LiveMatchupTable also leaves Live in Task 4 → delete then).
- docs/ANALYSIS.md: short §10 "Takeaways"; DEVELOPMENT_PROGRESS entry.

## Task 2 — Matches row + most played line (PR "one-question-matches")
- `rowMeta` loses `kp`; MatchRow second line = CS/min. Test update in `match-row-view.test.ts`.
- `mostPlayedLine(summaries): string | null` in `lib/header-donuts.ts` or a new `lib/most-played.ts` (TDD), rendered under PerformanceHeader.

## Task 3 — Performance trims (PR "one-question-performance")
- performance.tsx renders GoalProgressCard, TierCompareCard, SessionsCard only. Delete RecentCard, ChampionPoolCard, RolesCard, ChampionsCard and now-unused helpers (`recordLine`, `mainRoleLine`, `winRateColor`, `headerDonuts` only if Matches stops using it — it does not) with their tests. `recentSnapshot` stays if the Matches header uses it; otherwise delete with its test.

## Task 4 — Live trims (PR "one-question-live")
- live.tsx in-game: LiveHero, note, ImpactCard, ended card. Delete LiveMatchupTable, LiveStatTiles, EventsFeed, LiveTrendChart, `live-sections.ts` (+ tests), `appendTrendPoint` if orphaned.
- PrepareCard: replace MatchupsTable with one ban line (`banSuggestion` text already exists); delete MatchupsTable.

## Task 5 — Docs + memory
- DEVELOPMENT_PROGRESS per task; memory note on the concept.
