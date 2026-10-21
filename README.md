# LoL Personal Performance

A simple, personal League of Legends performance companion. Two tabs on your phone or tablet: **Matches** (how *you* did in each game, against your lane opponent) and **Live** (your own stats during a match, on a second screen). A small macOS desktop app collects data from the League client and sends it to your phone. No stats are shown on the desktop.

Design: `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md`
Roadmap: `LOL_PERSONAL_PERFORMANCE_ROADMAP.md`
Progress: `DEVELOPMENT_PROGRESS.md`

## Workspaces

| Path | What |
|---|---|
| `packages/shared` | Types and pure helpers shared by both apps (Riot ID parsing, regions, Riot disclaimer). |
| `apps/desktop` | Electron collector for macOS. Signs in, detects League, relays live data. |
| `apps/mobile` | Expo app for iOS/Android phones and tablets. |

Backend is the existing RiftLens Supabase project (Edge Functions + tables). The Riot API key lives only there.

## Setup

```bash
pnpm install
cp apps/desktop/.env.example apps/desktop/.env
cp apps/mobile/.env.example apps/mobile/.env
# Fill both with the Supabase URL and anon key from the RiftLens project
```

## Commands

```bash
pnpm test        # all workspaces
pnpm typecheck
pnpm lint
```

## Legal

LoL Personal Performance isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
