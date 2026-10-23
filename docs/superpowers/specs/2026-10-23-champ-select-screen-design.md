# Champion select screen — design note (2026-10-23)

**Why.** Owner: when the client enters champion select, the phone should show a screen of recommendations drawn from the player's own history, with bans and picks, plus a meta ban list (option 1: a curated list kept in the repo per patch).

**When it shows.** The desktop publishes `live-phase` with `pick` (own cell only: assigned position, locked champion). The phone opens the screen on the transition into `ChampSelect` (never on the first observation, like the Live auto-open), closes it by itself when the phase leaves champion select (the game loads → Live tab as today), and does not reopen it for the same champion select once the player dismissed it (keyed by the phase's `since`).

**What it shows** (for the assigned role; the role the player was viewing in Prepare while the client has not assigned one):
- Headline: "Champion select · Mid"; once a champion is locked, "Playing Zed · Mid" with the player's record on that champion in that role and the goal that will apply (`goalFor`).
- **Bans from your games**: the lane opponents in that role you lost to most (`toughestMatchups`, ≥ 2 games, "few games" under 3), W–L and win rate. Sentence form, never an order ("You lost 4 of 5 against Yasuo as mid").
- **Meta bans**: `META_BANS` in shared, a curated list per role with an `updatedOn` date shown on screen; updated by hand each patch. Not Riot data.
- **Your picks**: `recommendedPicks(all, role)`: `best` = champions with ≥ 3 games in that role by win rate (then games), top 5; `mostPlayed` = the rest by games, top 5. W–L, win rate, KDA, CS/min.

**Riot policy.** Own data only (own cell, own match history); pre-game, not in-game; descriptive wording. Enemy picks in champion select are not read.

**Pure helpers (tested).** `recommendedPicks`, `metaBansFor` (shared); `champSelectNavigation` (mobile).
