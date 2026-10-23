# Post-game screen — design note (2026-10-23)

**Why.** Owner: the second screen to build after champion select. When the game ends the phone should show, by itself, what the player did, whether the goal was met, and take them to the match review.

**When it shows.** The desktop's final snapshot gives the phone an `endedAt`. The screen opens on a new `endedAt` (never on the first observation), closes by itself when the next queue starts (Matchmaking / ReadyCheck / ChampSelect) or a new game goes live, and a game the player closed by hand is not reopened.

**What it shows.**
- Champion portrait, K/D/A and CS/min from the last snapshot, the Live stat tiles.
- Goal met / not met / not measured, with the goal and the final value (`goalFor` + `liveMetrics`, same as Live).
- **Match review**: Riot lists a finished game a minute or two later. The screen refreshes the Matches id list every 20 s until the newest match started within the game's length (plus slack) before `endedAt` (`isReviewOf`), then shows Victory / Defeat and "Open the match review" (replaces the modal with the review in the Matches tab). After 6 minutes it stops and points to Matches; Practice Tool and custom games never appear.

**Pure helpers (tested).** `postGameNavigation`, `isReviewOf`, `reviewWaitState`.
