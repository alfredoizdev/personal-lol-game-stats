# Prepare by role — design note (2026-10-23)

**Why.** Owner feedback after device testing of Phase 8: in League you queue with two roles and may be assigned either, and the champion you planned can be banned, so a Prepare card that asks for a champion does not match how a game starts. A second request the same day: one place to set the goal ("this app is supposed to be easy to use"), the editor we already had, not a separate "Save for every game" block.

**What changes.**

- Prepare asks for **your two roles** (primary, secondary), kept on the device. The first time they come from your own games (most played, next most played). A "Showing" toggle switches the card between the two.
- For the role shown: **your record** (games, win rate, KDA, CS/min, honest about the sample), **toughest matchups** and the **ban note**. No champion picker, no per-champion record before champion select.
- **One goal editor**, the existing one (metric chips, stepper, recommended value with your average, ruler, Save goal, visible confirmation). It stores a standing goal (`champion_id 0`, `role ANY`): `target null` while the value is the recommended one (resolved at game time to the role you play), the number once moved. The standing-goal block introduced earlier the same day is removed. Champion- and role-specific rows already stored keep working through `goalFor`'s fallback order.
- **Champion select** (desktop `live-phase.pick`, own cell only): the card headline becomes "Champion select · Mid" then "Playing Zed · Mid"; record, matchups, ban and the recommended value follow the assigned role; with a locked champion the record is for that champion in that role.

**Not changed.** Goal resolution (`goalFor`), the match review, Live, push. No new Riot calls, no schema change (migration 20261023000005 already allows the standing row).

**Pure helpers (tested).** `roleSummary`, `playedRoles` (shared); `activeRole`, `prepareHeadline`, `standingTarget`, `defaultRoles`, `goalSaveState` with a null target (mobile).
