# LanePulse — development build for push notifications (owner steps)

Expo Go cannot receive remote push notifications, so the goal updates of
Phase 7 are accepted on an EAS **development build**. Everything below runs
with the owner's accounts; nothing here touches the Riot key.

## One-time setup

```bash
cd ~/Desktop/lol-app-v-2/apps/mobile
npx eas login                       # Expo account (create one at expo.dev if needed)
npx eas init                        # writes extra.eas.projectId into app.json — commit that change
```

`expo-dev-client`, `expo-notifications` and `expo-device` are already in
`package.json`; `eas.json` has the profiles.

## Android (no Apple Developer Program needed)

```bash
npx eas build --profile development-device --platform android
```

EAS asks to generate a keystore the first time (say yes). For push on
Android, EAS also needs FCM credentials: in the Firebase console create a
project with the package `com.lpp.mobile`, download the service-account JSON
and upload it with `npx eas credentials` → Android → Push Notifications
(FCM V1). Install the resulting APK on the phone, open it, and start the
dev server with `npx expo start --dev-client`.

## iOS (needs the Apple Developer Program, USD 99/year)

```bash
npx eas build --profile development-device --platform ios
```

EAS creates the provisioning profile and the APNs key on first run (sign in
with the Apple ID of the developer account when prompted). Install through
the link EAS prints (device must be registered: `npx eas device:create`).

`--profile development` (iOS simulator) builds faster but cannot receive push.

## Accepting the goal push (Phase 7, task 8 step 3)

1. Sign in on the build, Profile → Notifications → turn on **Goal updates
   during games** (keep "Only when my status changes").
2. In Live → Prepare, save a goal for the champion and role you will play.
3. Keep the desktop companion signed in with the same account and League open.
4. Play one game. Expected: one notification once the first minute passes
   ("01:12 · Goal 7.0 CS/min · On track, now 7.5"), one on each status
   change, and "Game over · Goal met/missed · …" at the end. Tapping one
   opens the Live tab. Nothing arrives if the toggle is off.

## Public site (Vercel)

Live at https://lanepulse.vercel.app (Vercel project `lanepulse`, first
deployed 2026-10-22). The site is deployed **prebuilt**: `build.mjs` runs
locally (it imports `packages/shared/src/legal.ts`, outside the site folder,
which a Vercel-side build would not see) and the static `dist/` is uploaded.

```bash
cd ~/Desktop/lol-app-v-2/apps/site
pnpm build                      # writes dist/ (git-ignored, holds the Vercel link)
cd dist && npx vercel deploy --prod --yes
```

If `dist/.vercel` is missing (fresh clone), link first:
`cd dist && npx vercel link --yes --project lanepulse`. The hashed deployment
URL is protected by Vercel SSO; share the alias `https://lanepulse.vercel.app`.
A custom domain goes in the Vercel dashboard → Project → Domains.
