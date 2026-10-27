# Goal by role — design (2026-10-26)

**Owner's question:** "¿los goals no deberían cambiar según el rol? Un jungla,
¿de verdad debería preocuparse por visión?"

## Finding

Until now the player chose the metric and it stayed fixed across roles; only the
number adapted (the role target), with one exception (CS for support → vision).
A jungler with the default goal got "5.5 CS/min", which is the role target but
not what defines a jungle game. The app's own scoring table already says what
each role is measured on first: CS for Top/Mid/Bot, kill participation 60 % for
jungle (the map, not the farm), vision 2.0/min for support. Jungle vision does
matter (target 1.0/min, nearly double a laner's), but as a single goal KP
describes the jungle game better. Whether a particular jungler should work on
vision depends on that player's own numbers, and the app has them.

## Decision (owner picked option 2)

- **Recommended for my role** (default): each role gets its own goal. The metric
  is the one furthest below the role target over the player's newest 20 games in
  that role (`recommendedGoal`, shortfall as a fraction of the target; deaths
  count when they exceed the limit). With fewer than 3 games in the role, or
  nothing below target, the role's first metric (`defaultMetricFor`: jungle →
  kpPct, support → visionPerMin, lanes → csPerMin).
- **A fixed metric and number** applies to every role, except roles where the
  metric is not scored (CS for support), which keep their recommended goal.
- **One editor**, as before. The "Recommended" mode lists the five roles with
  their goal and the reason in words ("your weakest as jungle: 0.5 on average
  over 12 games").
- **Save materialises one row per role** (`roleGoalRows`, champion 0, role R,
  numeric target) plus the standing row that records the mode (target null =
  recommended). Live, the match review and the desktop push all resolve through
  `goalFor` without needing the match history, so they agree. A newer role-wide
  row beats an older champion-specific row for the same role; the last thing
  saved wins.
- The recommendation is computed at save time; saving again refreshes it.

## Riot policy

Own data only; the recommendation is a statement about the player's record
against published role targets; no instruction in-game.

## Revision (2026-10-27, owner on the simulator)

The five-role list was too much ("hay que hacerlo más sencillo"; "el user escoge
el goal que quiere"). The player picks the metric; the number follows the role
(each role's target) unless they fix one. The weakest-metric computation stays
as a one-line suggestion for the role shown, tap to pick. Save still writes one
row per role. The Save button sits right under the number; the reference ruler
moves to the bottom.

