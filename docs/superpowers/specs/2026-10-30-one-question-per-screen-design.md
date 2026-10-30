# One question per screen — simplification design

**Owner's brief (2026-10-30):** "aún lo veo muy complicado, muchos stats, o la manera en que se muestra no es la ideal". LanePulse is a personal trainer: what the player did, never what the team or the enemy did; comparisons stay (vs the lane opponent, vs the player's own average, vs the tier), but each screen must answer one question with one big number, one comparison and one sentence.

**Research (2026-10-30):** Mobalytics/Blitz give a 1–10 grade plus a dense multi-dimension report their users call heavy; op.gg gives a 0–10 OP Score, a badge and one row of numbers per game and is read in two seconds (the owner's reference). Coaches agree on a short list: CS/gold vs the lane opponent at 10/15, deaths per game, kill participation, damage per minute, vision; "too many metrics confuse".

## Goals
- Each screen answers one question. Numbers roughly halve (≈140 → ≈80 distinct figures across the app).
- Comparisons live inside the row that carries the number ("7.2 vs 6.1 CS/min"), never as separate tables.
- Nothing new is computed except the takeaways selection; everything else is removal and rearrangement.

## Non-goals
- No new metrics, no new Riot calls, no tactical advice (Riot policy), no change to the scoring engine (docs/ANALYSIS.md §1–6 stand).

## Screens

### 1. Match Review — "¿Qué tal lo hice?"
Keeps: MatchHero (result, KDA, CS/min, duration), OverallScoreCard (1–10 tier + headline), "How it's scored" link, Disclaimer.
New: **TakeawaysCard**, up to three rows:
- **Best** (green): the scored subrow with the highest score across areas.
- **Worst** (red): the scored subrow with the lowest score. When only one scored subrow exists, only Best is shown.
- **Goal** (green/red/plain): the goal in force at game end, met / missed / not measurable (existing `goalLine`).
Each row: label · your value · comparison. The comparison is "vs rival N" when the subrow has a lane opponent value, else "vs you N" when the baseline has it, else "target N" (role target). Lane-lead rows ("+12 CS @10 · +300 @15") compare with nothing (the value already is the comparison).
Removes: AreaPills, AreaCard (sub-row bars), CsCurveChart, GoldDiffChart, LaneMatchupCard, the timeline hint. The timeline is still fetched: lane leads at 10/15 are among the candidates.

### 1b. Post-game (Match ended) — the waiting room
Keeps: hero (result once known, champion, role), goal verdict, the "Match review" waiting card with Close.
Removes: PostGameStats and LiveMatchupTable (they duplicate the review that opens by itself).

### 2. Matches — "¿Cómo me va últimamente?"
Keeps: profile + rank cards, Last-N donuts header, rows (W/L strip, portrait with tier badge, KDA, LP, items).
Changes: the row's second line shows CS/min (the K/P line goes). Under the donuts header, one line with the two most played champions of the window: "Most played · Vel'Koz 13 games · Kindred 3".

### 3. Performance — "¿Estoy mejorando?"
Keeps, in this order: Your goal week by week · You vs <tier> · Your sessions. Queue filter chips and the loading / short / empty states stay.
Removes: Last 20 games (duplicates the Matches header), Champion pool, Roles, Champions (op.gg inventory, not training). Their components and helper functions that lose every caller are deleted with their tests.

### 4. Live — "¿Qué está pasando ahora?"
In game: LiveHero + ImpactCard + AlertStack (+ the stale/loading note). Removes LiveMatchupTable, LiveStatTiles, EventsFeed, LiveTrendChart.
Before a game: PhaseCard + Prepare. Prepare keeps headline/portrait, role chips, your record, the goal editor and ONE ban line ("Ban to consider: Zed — you lost 4 of 5 as Mid"); the Toughest matchups table goes.

### 5. Champion select — unchanged.

## Copy rules
Labels exactly as the engine's subrow labels ("CS / min", "Kill participation", "Deaths per 10 min", "Vision score / min", "Wards placed / min", "CS lead", "Gold lead", "XP lead", "Lane CS/min", …). Comparison words: "vs rival", "vs you", "target". Colours: win green for Best, loss red for Worst, goal by verdict.

## Left to the builder
Exact spacing; whether removed components are deleted or kept when another caller remains (delete when no caller remains).
