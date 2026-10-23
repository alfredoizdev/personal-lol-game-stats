# LanePulse — Riot Developer Portal application (draft)

Fill-in for the "Register Product" form. Items marked **[owner]** need the
owner's final value before submitting. Policy references: Riot Games
Developer Portal policies (General, API, Game Data). Scope: Production API
key for a larger-scale product. No RSO requested (the app only shows the
signed-in player's own data, linked by Riot ID).

## Product

- **Name:** LanePulse
- **Website:** https://lanepulse.vercel.app (deployed 2026-10-22; a custom
  domain can be added later without changing the site). Terms:
  https://lanepulse.vercel.app/terms.html · Privacy:
  https://lanepulse.vercel.app/privacy.html
- **Contact:** alfredodevelop@gmail.com
- **Platforms:** iOS and Android app (Expo / React Native); macOS desktop
  companion (Electron) that only runs while League is open.
- **Regions:** NA (primary), EUW, EUNE, KR, LAN, BR, JP, OCE, TR, RU — the
  regions the sign-up selector offers (`packages/shared/src/region.ts:3`).
  **[owner]** trim before submitting if you want a narrower launch.
- **Price:** free. No purchases, subscriptions or ads.

## Description

LanePulse is a personal performance companion for League of Legends. A player
links their own Riot ID and gets:

1. **Matches** — their recent games, each scored on a 1–10 ladder against
   role targets (CS per minute, kill participation, deaths, vision), with a
   per-game review of farming, combat, vision and lane that shows the number,
   the target and the gap. Every figure is the player's own.
2. **Prepare** — before queueing, the player sets one goal (for example
   7.0 CS per minute) that applies to every game; left at the recommended
   value it resolves to the role they are assigned. The card shows their own
   record and toughest lane opponents for their most played role (any role
   can be looked at),
   and in champion select it follows the assigned role and locked champion
   read from the player's own cell. The source of every number is stated.
   In champion select the phone shows a screen built from the player's own
   games for the assigned role (three of their own best or most played
   champions, three lane opponents they lost to most, the goal that will
   apply) plus three champions from a curated, dated meta ban list kept in the
   app; only the player's own cell is read
   from the client, never the other players' picks, and every line is a
   statement about their own record.
3. **Live** — while a game runs, the desktop companion reads the local Live
   Client Data API and relays the player's own stats (CS, KDA, level, vision,
   items, game time) to their phone over a private channel. The phone shows
   the player's numbers and whether the goal is on track. The lane opponent's
   scoreboard stats — the ones the game already shows the player — appear
   beside them; nothing else about other players. The same tab shows what the
   client is doing before a game (in lobby, searching, champion select) and,
   during it, the game's own event feed (kills, deaths with the respawn
   timer, objectives, structures) exactly as the client displays it.
4. **Performance** — the player's last 100 games summarised: average score,
   recent form against their own average, roles, areas, champions and the
   lane opponents they lose to most. All from their own cached games.
5. **Goal updates (opt-in)** — during a game, a push notification with the
   game time, the goal and the current value ("15:00 · Goal 7.0 CS/min ·
   Below goal, now 5.2"), and one at game end ("Game over · Goal met ·
   7.3 CS/min"). Off by default; status only.

**What it does not do:** no tactical advice or instructions in-game or in
notifications; no information about the current game that the client does
not show the player; no data about other players, no rankings or
comparisons with other accounts; no automation of any game input; no
scraping; no sale of data.

## Riot data used

| Data | Endpoint | Shown as |
|---|---|---|
| Account id for a Riot ID | account-v1 by-riot-id | Links the account; shows the Riot ID |
| Match ids | match-v5 ids by puuid | The match list (20) and the 100-game window |
| Match details | match-v5 match | Scores, reviews, performance aggregates |
| Match timeline | match-v5 timeline | Lane review (CS and gold curves of the player's own lane) |
| Live game stats | Live Client Data API (local) | Live tab, goal status, push text |
| Client phase and signed-in Riot ID | LCU (local) | Detecting a game; matching the player to their linked account |

Call volume, caching and limits: `docs/riot/call-budget.md` (≈ 145 calls on a
user's first day, ≈ 45 a day after; one bounded burst of up to 100 requests
in a 10 s window during the one-time 100-game load, which a 429 stops).

Data retention and deletion: `docs/riot/deletion.md`; Privacy Policy sections
"Retention" and "Deleting your data".

## Policy self-check

| Policy point | How LanePulse complies | Proof (screenshot) |
|---|---|---|
| No unfair competitive advantage | Only the player's own stats; the live view adds nothing the scoreboard does not show | Live tab, desktop status window |
| No "solving the game" / no tactical instruction | All copy is descriptive status; a test asserts notification text contains no instruction words (`packages/shared/tests/goal-notifier.test.ts`) | Live tab, a notification |
| No session information unknown to the player | Live data comes from the player's own client (Live Client Data API); no spectator or third-party data | Live tab |
| Own data only | Accounts are linked by Riot ID; every query is scoped to the signed-in user under row-level security | Profile (linked accounts) |
| Riot disclaimer visible | `RIOT_DISCLAIMER` at the bottom of every app screen, the desktop window and every site page | Any screen; site footer |
| Terms and Privacy published | Public site pages, in-app screens, accepted at sign-up (version stored) | Sign-up, Profile → Legal, site |
| Data deletion available | Profile → Delete account and data → cascade verified | Profile; `deletion.md` |
| Rate limits respected | Server-side key, caches by match id, bounded backfill; 429 stops the run | `call-budget.md` |
| Free, no monetisation of Riot data | No paid tier, no ads | Site |
| Key never in a client | Supabase secret only; Edge Functions proxy every call | Repository (no `RGAPI-` anywhere) |

## Screenshots to attach (owner's account)

1. Matches tab with scores and the header donuts.
2. A Match Review (overview + one area).
3. Live tab during a game (goal line visible) and the desktop status window
   with the disclaimer.
4. Prepare (goal editor with its source line).
5. Performance tab (overview and matchups).
6. Profile with Riot accounts, Notifications and Legal sections.
7. Sign-up with the Terms / Privacy links; the Terms screen.
8. Public site: product page, Terms, Privacy.
9. One goal notification on the phone (from the EAS development build).

Existing captures: `docs/screenshots/phase2-matches.png`,
`phase3-review-*.png`, `phase4-live*.png`, `phase6-*.png`,
`phase7-live-private-channel.png`, `phase7-*.png`.

## Submission checklist

- [x] Site deployed and URL pasted above (Vercel project `lanepulse`).
- [ ] Legal entity reviewed (`packages/shared/src/legal.ts`, `LEGAL_ENTITY`).
- [ ] Regions trimmed or confirmed.
- [ ] Screenshots 1–9 taken with the owner's account.
- [ ] Deletion manual check done (`deletion.md`).
- [ ] Goal push accepted on a development build (`build.md`).
