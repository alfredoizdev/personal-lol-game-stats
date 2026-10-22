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

Your average over your last 20 analyzable games in the same role, excluding
remakes and the game being reviewed. With fewer than 3 games the average is
labelled "few games" and the "vs you" deltas are hidden.

## 6. Sentences

Each area's sentence names its weakest scored sub-row with the concrete number
and its reference: "for your opponent" when the opponent's value exists,
otherwise "the N target for your role". Context rows never drive a sentence.
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
  5.9 for your opponent (14–25 min)." Headline: "Solid all around".
