# How LanePulse scores a match

Every number in Match Review is reproducible by hand from this page. The code
is `packages/shared/src/analysis/` and the tests in `packages/shared/tests/analysis-*.test.ts`
assert the worked example below.

## 1. What is analyzed

Only Summoner's Rift PvP queues: 400 (Normal Draft), 420 (Ranked Solo), 430
(Blind), 440 (Ranked Flex), 480 (Swiftplay), 490 (Quickplay), 700 (Clash).
Remakes (early surrender or under 5 minutes), bot games, ARAM and Arena show the
hero and the lane matchup only. A game without a detected role is not analyzed.

## 2. Targets per role

Scores come **only** from this table. Comparisons against your lane opponent or
your own average are shown as deltas and never change a score.

| Metric | TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY |
|---|---|---|---|---|---|
| CS/min target | 7.0 | 5.5 | 7.0 | 7.5 | not scored |
| Vision score/min target | 0.6 | 1.0 | 0.6 | 0.6 | 2.0 |
| Wards placed/min target | 0.25 | 0.4 | 0.25 | 0.25 | 0.9 |
| Deaths per 10 min ("good" ceiling) | 1.5 | 1.5 | 1.5 | 1.5 | 1.8 |
| Kill participation target | 45 % | 60 % | 55 % | 55 % | 60 % |

## 3. Curves

**Ratio curve** (higher is better): `ratio = value / target`.
`ratio ≤ 0.5 → 0`, `ratio = 1.0 → 70`, `ratio ≥ 1.3 → 100`, linear in between,
rounded to an integer. For deaths (lower is better) the ratio is `target / value`;
zero deaths scores 100.

**Lane difference curve** (me − opponent at 10 and 15 minutes):

| Metric | floor → 0 | mid → 60 | ceil → 100 |
|---|---|---|---|
| CS | −40 | 0 | +25 |
| Gold | −1500 | 0 | +1500 |
| XP | −1000 | 0 | +1000 |

A lane sub-row's score is the rounded mean of its @10 and @15 scores (one of
them when the other is missing).

**Rating words:** Poor < 40, Fair 40–59, Good 60–79, Great ≥ 80.

**Match rating ladder** (shown as "9+" on list rows and "9+ · Dominant" on the
overall card; same ladder RiftLens used): 10+ Legendary Carry ≥ 95 · 9+ Dominant
≥ 85 · 8+ Strong Game ≥ 75 · 7+ Reliable ≥ 65 · 6+ Average ≥ 55 · 5+ Needs Work
≥ 45 · 4+ Weak ≥ 35 · 3+ Struggling ≥ 25 · 2+ Critical ≥ 15 · 1+ Disaster below.
List rows rate from the match data alone (no timeline, no baseline), so the
review's score, which adds Lane and the phases, can differ by a few points.

## 4. Sub-rows and weights

| Area | Scored sub-rows (weight) | Context rows (never scored) |
|---|---|---|
| Farming | CS/min total (40), lane phase 0–14 (20), mid game 14–25 (20), late game 25+ (20). Without a timeline: total (100). | — |
| Combat | Kill participation (50), deaths per 10 min (50) | KDA, damage to champions per minute |
| Vision | Vision score/min (60), wards placed/min (40) | Wards destroyed |
| Lane | CS, gold and XP lead at 10 and 15 min, equal weights. UTILITY: gold and XP only. | — |

A phase counts only when the game lasted at least 2 minutes into it. Missing
(`null`) sub-rows drop out and the remaining weights renormalize. An area with
nothing scored is hidden with a reason.

**Area weights by role:** TOP / JUNGLE / MIDDLE / BOTTOM → Farming 35, Combat
30, Lane 20, Vision 15. UTILITY → Vision 40, Combat 30, Lane 30 (Farming is
not scored). Hidden areas drop out and the rest renormalize. The overall score
is that weighted mean.

## 5. "vs you" baseline

Your average over the games in the same role among your last 20 analyzable
games, excluding remakes and the game being reviewed (so `n` is usually well
under 20). With fewer than 3 games the average is
labelled "few games" and the "vs you" deltas are hidden.

## 5b. Goal references (pre-match)

Under the goal stepper the app draws a ruler with: your average (champion ≥ 3
games, else role), the average of the lane opponents you actually faced in that
role, your best game, the role target, and an **approximate** ladder of typical
values per rank (Iron → Master+). The ladder is a community estimate for
Summoner's Rift, not Riot data; it is labelled as such and never moves a score.
Recalibrated 2026-10-27 on per-rank community datasets. Mid CS/min ladder:
5.4 · 5.7 · 6.0 · 6.3 · 6.6 · 6.9 · 7.2 · 7.6 (top the same, bot ×7.5/7); jungle
has its own CS ladder 5.7 → 7.3 (camps count, so it is not the laner one scaled
down); vision per minute by role: laners 0.8 → 1.2, jungle 1.2 → 1.8, support
1.5 → 3.0; deaths per 10 min 2.2 → 1.3; kill participation 41 → 49 for laners,
+8 for jungle, support 50 → 59. The same ladder feeds the Performance tab's
"You vs <tier>" comparison (your averages in your main role next to the value
for your Solo/Duo tier; Gold when unranked).

## 6. Sentences

Each area's sentence names its weakest scored sub-row with the concrete number
and **the reference the score was built from**: the role target ("vs the 7.5
target for your role"), with the opponent's value appended as context when it
exists (", opponent 5.9"). Lane sentences cite one number (you − opponent at 15
min, or at 10 when 15 is missing) and their adjective (lead / deficit) follows
the sign of that number, never the mean score. Context rows never drive a
sentence.
The headline names the weakest area when it is below 60, otherwise "Solid all
around". No tactical advice, no win probability.

## 7. Worked example (asserted by `analysis-areas.test.ts`)

30-minute Ranked Solo game, BOTTOM. You: 6/3/8, 210 CS (7.0 CS/min), vision
score 27, 9 wards placed, team kills 20. Opponent: 195 CS (6.5 CS/min).
Timeline CS: 105 at 14 min, 170 at 25 min, 210 at 30 min. Lane diffs: CS +5 @10,
+8 @15; gold +200 @10, +300 @15; XP +200 @10, +300 @15.

- **Farming:** total 7.0/7.5 = 0.933 → 61. Lane phase 105/14 = 7.5 → ratio 1.0 → 70.
  Mid (170−105)/11 = 5.9 → 0.788 → 40. Late (210−170)/5 = 8.0 → 1.067 → 77.
  Area = (61·40 + 70·20 + 40·20 + 77·20)/100 = 61.8 → **62, Good**.
- **Combat:** KP (6+8)/20 = 70 % vs 55 → 1.273 → 97. Deaths 3 per 30 min = 1.0 per
  10 vs 1.5 → 1.5 → 100. Area = 98.5 → **99, Great**.
- **Vision:** 27/30 = 0.90/min vs 0.6 → 1.5 → 100. 9/30 = 0.30 wards/min vs 0.25 →
  1.2 → 90. Area = (100·60 + 90·40)/100 → **96, Great**.
- **Lane:** CS +5 → 68, +8 → 73 → 71. Gold +200 → 65, +300 → 68 → 67. XP +200 → 68,
  +300 → 72 → 70. Area = mean → **69, Good**.
- **Overall:** (62·35 + 99·30 + 69·20 + 96·15)/100 = 79.6 → **80, Great**.
- Sentence (Farming, weakest sub-row = mid game): "Slow mid game: 5.9 CS/min vs
  the 7.5 target for your role, opponent 5.9 (14–25 min)." Headline: "Solid all
  around".
- A timeline frame that lacks a participant is `null` in the reduced series and
  simply drops out (no lead or deficit is invented); phase CS/min divides by the
  minutes the two frames really cover.

## 8. Performance page aggregates (`performance/profile.ts`)

The Performance tab is built on the player's last 100 analyzable, non-remake
games (owner's call, 2026-10-22: one rule for every card). On open it fetches
the last 100 match details by itself behind one progress bar, once per account,
through the same cached `match-detail` function; nothing on the tab asks the
player to load more.

- **Game score** = the Matches-row score: `analyzeMatch` with no timeline and no
  baseline (section 1 rules, Farming "total" only). Overview = mean of those
  scores, named with the tier ladder; last 10 games shown oldest → newest;
  streak only from 2 games in a row. Its comparables are the player's own:
  the mean of the previous window of the same size (games 21–40 when the
  window is 20), the best and worst game in the window, and how many games reached the
  70 mark (7.0 on 10: every role target met), which is also drawn on the ring.
- **Roles:** games, win rate and mean score per role; "few games" under 3.
  Strongest / weakest only among roles with ≥ 3 games (mean score, then win rate,
  then games); a single rankable role has no weakest.
- **Areas:** mean of the Farming, Combat and Vision area scores over the games
  where the area is scored (supports: no Farming). **Lane is never aggregated**:
  it needs each game's timeline, which the page does not download. Each scored
  sub-row shows its mean value and the **mean of the per-game role targets**
  (a "typical" target when roles are mixed). Weakest area needs ≥ 3 games.
- **Champions:** by games (then win rate, then name), with the most-played role
  for that champion, mean score tier and "few games" under 3; at most 8.
- **Lane matchups:** over **twice the window** (the last 40 games: a repeat
  opponent is rare inside 20), grouped by (enemy champion, role) when the enemy has the same role; ≥ 2 games. "You lose to" = the 5 lowest win rates under 50 %
  (then more games, then name); "You beat" = the 3 highest above 50 %. An even
  record is in neither list.
- **Headline** is descriptive only: "52% win rate over 20 games · strongest as
  Mid · Vision is your weakest area".

## 9. Matches header donuts

The "Last 10 Games" card on the Matches tab draws its three stats as semi-donuts
(`apps/mobile/src/lib/header-donuts.ts`), over the same window as `aggregateMatches`.
**Avg KDA:** the 10-game mean KDA against a fixed target of 3.0 through the ratio
curve of section 3 (3.0 → 70, Good), rated with the usual Poor/Fair/Good/Great bands.
**CS/min:** mean of the per-game `scoreRatio(csPerMin, ROLE_TARGETS[role].csPerMin)`;
support games have no CS target and drop out (null when only supports were played).
**Win rate:** the arc is the rate itself; the word uses its own bands: < 40 Poor,
40–49 Fair, 50–59 Good, ≥ 60 Great. Arc colour = rating colour; muted when null.

## 10. Takeaways (`analysis/takeaways.ts`, 2026-10-30)

The Match Review shows at most three lines instead of the area tabs: **Best** = the scored, non-context sub-row with the highest score across all areas; **Work on** = the one with the lowest (omitted when only one sub-row is scored); **Goal** = the goal in force at game end with its verdict. Each line carries the engine's own comparison, in this precedence: the lane opponent's value (`vs rival 6.5`), else the player's baseline (`vs you 6.5`), else the role target (`target 7.0`); lane-lead rows carry none (their value already is a difference). Sub-rows expose `opponentDisplay`, `youDisplay` and `targetDisplay` for this. Scores are unchanged.
