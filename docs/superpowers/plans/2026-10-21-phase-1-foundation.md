# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pnpm monorepo where the Expo app signs in, links a Riot ID and shows the two tabs, and the Electron collector signs in with the same account and detects League running on macOS.

**Architecture:** Three workspaces: `packages/shared` (types and pure helpers), `apps/desktop` (Electron main owns the Supabase session and the League detector; a minimal Vite renderer only shows status and collects credentials over a typed preload bridge), `apps/mobile` (Expo Router app, Supabase client with SecureStore). League detection modules are copied from RiftLens (`~/Desktop/lol-app-ui/desktop-app/electron/league/`) with their tests and trimmed. Supabase project, Edge Functions and tables are RiftLens's, unchanged.

**Tech Stack:** pnpm workspaces, TypeScript strict, Vitest, Electron (latest stable) + Vite + React, Expo SDK (latest stable via `create-expo-app`) + Expo Router, `@supabase/supabase-js` v2, `electron-store`, Electron `safeStorage`.

**Spec:** `docs/superpowers/specs/2026-10-21-lol-personal-performance-v2-design.md` (sections 3, 5, 6.1, 8, 9 row "1").

## Global Constraints

- Riot API key never appears in any workspace. The only secrets in clients are the Supabase URL and anon key, read from `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mobile) and `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (desktop renderer build) plus `SUPABASE_URL` / `SUPABASE_ANON_KEY` (desktop main). Same project as RiftLens: copy values from `~/Desktop/lol-app-ui/mobile-app/.env`.
- Electron: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Preload exposes only the functions listed in Task 4. IPC channel strings are inlined in preload (sandboxed preload cannot `require` relative modules).
- Desktop renderer never holds the Supabase session; the main process does.
- macOS only in this phase. No Windows code paths.
- LCU usage is read-only GET: `/lol-summoner/v1/current-summoner`, `/lol-gameflow/v1/gameflow-phase`, `/lol-lobby/v2/lobby`. Nothing else is copied from `lcu-client.ts`.
- Riot disclaimer text (verbatim, visible in both apps): "LoL Personal Performance isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc."
- No `matches`, `match_events`, `last_game_snapshots` tables are read or written.
- TypeScript `strict: true` everywhere. `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` must pass at the end of every task.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. Riot ID with a `#` in the game name or a tag line with lowercase/leading spaces ("Hide on bush #KR1 "): `parseRiotId` must trim and split on the last `#`, and reject empty halves. Test in Task 1.
2. Lockfile present but LCU not yet listening (League booting): detector must stay `STARTING` for the grace window, not flip to `ERROR`. Covered by the copied `detector.test.ts` in Task 2; keep that case.
3. Desktop launched with a stored session whose refresh token is revoked: main must clear the stored session and report `signed-out`, never loop on refresh. Test in Task 4.
4. Mobile user with a session but no row in `linked_riot_accounts`: must land on the link screen, not the tabs, and must not crash on an empty query. Test in Task 6.
5. `link-riot-account` returning `NOT_FOUND` (404) or `RATE_LIMITED` (429): link screen shows a specific message per code and keeps the form editable. Test in Task 6.

---

### Task 1: Monorepo skeleton + `packages/shared`

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.npmrc`, `README.md`, `DEVELOPMENT_PROGRESS.md`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/index.ts`, `packages/shared/src/riot-id.ts`, `packages/shared/src/region.ts`, `packages/shared/src/types.ts`
- Test: `packages/shared/tests/riot-id.test.ts`, `packages/shared/tests/region.test.ts`

**Interfaces:**
- Produces:
  - `parseRiotId(input: string): { gameName: string; tagLine: string } | null`
  - `formatRiotId(gameName: string, tagLine: string): string` → `"Name#TAG"`
  - `type Region = 'NA'|'EUW'|'EUNE'|'KR'|'LAN'|'BR'|'JP'|'OCE'|'TR'|'RU'`; `REGIONS: readonly Region[]`; `REGION_TO_PLATFORM: Record<Region,string>` (values exactly as in `link-riot-account/index.ts`: NA→na1, EUW→euw1, EUNE→eun1, KR→kr, LAN→la1, BR→br1, JP→jp1, OCE→oc1, TR→tr1, RU→ru); `platformToRegion(platform: string | null): Region` (reverse lookup, default `'NA'`)
  - `types.ts`: `Summoner`, `GameflowPhase`, `LeagueStatus` copied verbatim from `~/Desktop/lol-app-ui/desktop-app/shared/types.ts` (lines 1–7, 192–203, 373–377) minus `Profile`/`cachedProfile`: `LeagueStatus = { state:'CLOSED' } | { state:'STARTING' } | { state:'CONNECTED'; summoner: Summoner; lcu: { port: number } } | { state:'ERROR'; reason: string }`
  - `RIOT_DISCLAIMER: string` (the verbatim text from Global Constraints)

- [ ] **Step 1:** `git init`, write root `package.json` with scripts `typecheck`, `lint`, `test` as `pnpm -r run <script>`, `pnpm-workspace.yaml` listing `apps/*` and `packages/*`, `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`, `module: ESNext`, `moduleResolution: Bundler`. `.gitignore`: `node_modules`, `dist*`, `.env`, `.expo`, `ios`, `android`, `*.log`.
- [ ] **Step 2:** Write `packages/shared/tests/riot-id.test.ts`:

```ts
import { parseRiotId, formatRiotId } from '../src/riot-id'
test('splits on last # and trims', () => {
  expect(parseRiotId(' Hide on bush #KR1 ')).toEqual({ gameName: 'Hide on bush', tagLine: 'KR1' })
})
test('game name may contain #', () => {
  expect(parseRiotId('a#b#NA1')).toEqual({ gameName: 'a#b', tagLine: 'NA1' })
})
test('rejects missing halves', () => {
  expect(parseRiotId('NoTag')).toBeNull()
  expect(parseRiotId('#NA1')).toBeNull()
  expect(parseRiotId('Name#')).toBeNull()
})
test('format', () => { expect(formatRiotId('Name', 'TAG')).toBe('Name#TAG') })
```

- [ ] **Step 3:** Write `packages/shared/tests/region.test.ts`: `platformToRegion('euw1')` is `'EUW'`, `platformToRegion(null)` is `'NA'`, `platformToRegion('xx')` is `'NA'`, `REGION_TO_PLATFORM` has exactly 10 keys.
- [ ] **Step 4:** Run `pnpm --filter @lpp/shared test`. Expected: FAIL, modules not found.
- [ ] **Step 5:** Implement `riot-id.ts`, `region.ts`, `types.ts`, `index.ts` re-exporting all. Package name `@lpp/shared`, `"exports": { ".": "./src/index.ts" }` (source-consumed by both apps; no build step).
- [ ] **Step 6:** Run `pnpm -r test` and `pnpm -r typecheck`. Expected: PASS.
- [ ] **Step 7:** Write `README.md` (what the repo is, the three workspaces, `pnpm install`, env setup pointing at RiftLens's `.env` values) and `DEVELOPMENT_PROGRESS.md` with the six phases from the spec as checkboxes, Phase 1 tasks listed.
- [ ] **Step 8:** Commit: `chore: monorepo skeleton and shared package`.

---

### Task 2: League detection modules (copied from RiftLens)

**Files:**
- Create: `apps/desktop/package.json`, `apps/desktop/tsconfig.json`, `apps/desktop/tsconfig.main.json`, `apps/desktop/vitest.config.ts`
- Create: `apps/desktop/electron/league/process.ts`, `lockfile.ts`, `lcu-client.ts`, `detector.ts`, `apps/desktop/electron/logger.ts`
- Test: `apps/desktop/tests/process.test.ts`, `lockfile.test.ts`, `lcu-client.test.ts`, `detector.test.ts`

**Interfaces:**
- Consumes: `Summoner`, `LeagueStatus`, `GameflowPhase` from `@lpp/shared`.
- Produces:
  - `isLeagueRunning(): Promise<boolean>` (process.ts, unchanged)
  - `type LockfileData = { name: string; pid: number; port: number; password: string; protocol: string }`; `parseLockfile(raw: string): LockfileData | null`; `readLockfile(): Promise<LockfileData | null>` (lockfile.ts, unchanged)
  - `lcuGetCurrentSummoner(lockfile): Promise<Summoner>`, `lcuGetGameflowPhase(lockfile): Promise<GameflowPhase | null>`, `lcuGetLobbyQueueId(lockfile): Promise<number | null>`, and the private `lcuGet<T>(lockfile, path)` helper kept generic for Phase 4.
  - `startDetector(opts: { intervalMs: number; onChange: (status: LeagueStatus) => void }): DetectorHandle` where `DetectorHandle = { stop(): void; forceTick(): Promise<LeagueStatus>; currentIntervalMs(): number }`. The `onConnected`/profile callback is removed.
  - `logger.info/warn/error(msg: string)` writing to `~/Library/Logs/LoLPersonalPerformance/app.log` with the same `redact()` as RiftLens.

- [ ] **Step 1:** Copy the four league files, `logger.ts`, and their four test files from `~/Desktop/lol-app-ui/desktop-app/` (tests from `desktop-app/tests/`, plus `tests/setup.ts` if those tests import it). Change `LOG_DIR` to `LoLPersonalPerformance`.
- [ ] **Step 2:** Trim `lcu-client.ts` to: the HTTPS helper (`lcuGet`), `coerceSummoner`, `lcuGetCurrentSummoner`, `lcuGetGameflowPhase`, `lcuGetLobbyQueueId`, `KNOWN_PHASES`. Delete everything else (champ select, ready check, ranked, match history, EOG, PATCH/POST helpers). Trim `lcu-client.test.ts` to the cases for the kept functions.
- [ ] **Step 3:** Trim `detector.ts`: drop `Profile`, `cachedProfile`, `onConnected`; `CONNECTED` carries `summoner` and `lcu: { port }`. Update `detector.test.ts` expectations for the four states; keep the LCU grace-window case (Review Focus 2).
- [ ] **Step 4:** `tsconfig.main.json` mirrors RiftLens's (CommonJS, ES2022, `outDir: dist-electron`, include `electron/**/*.ts` and `shared/**/*.ts`). `vitest.config.ts` environment `node`, include `tests/**/*.test.ts`. Package name `@lpp/desktop`, depends on `@lpp/shared: workspace:*`, `electron-store`, `@supabase/supabase-js`, devDeps `electron`, `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `vitest`, `typescript`, `concurrently`.
- [ ] **Step 5:** Run `pnpm --filter @lpp/desktop test`. Expected: PASS for all four files. Run `pnpm --filter @lpp/desktop exec tsc -p tsconfig.main.json --noEmit`. Expected: no errors.
- [ ] **Step 6:** Commit: `feat(desktop): league detection modules from RiftLens, trimmed to read-only`.

---

### Task 3: Electron shell with status bridge and tray

**Files:**
- Create: `apps/desktop/electron/main.ts`, `apps/desktop/electron/preload.ts`, `apps/desktop/electron/ipc/channels.ts`, `apps/desktop/electron/store.ts`
- Create: `apps/desktop/shared/status-label.ts`, `apps/desktop/renderer/index.html`, `renderer/main.tsx`, `renderer/App.tsx`, `renderer/bridge.d.ts`, `renderer/components/StatusView.tsx`, `apps/desktop/vite.config.ts`
- Test: `apps/desktop/tests/status-label.test.ts`

**Interfaces:**
- Consumes: `startDetector`, `DetectorHandle` (Task 2); `LeagueStatus`, `RIOT_DISCLAIMER` (Task 1).
- Produces:
  - `IPC = { GetStatus: 'lpp:get-status', StatusChanged: 'lpp:status-changed', ForceRefresh: 'lpp:force-refresh', AuthGetState: 'lpp:auth-get-state', AuthSignIn: 'lpp:auth-sign-in', AuthSignOut: 'lpp:auth-sign-out', AuthStateChanged: 'lpp:auth-state-changed' }`
  - `window.lpp` (preload): `getStatus(): Promise<LeagueStatus>`, `onStatusChanged(cb: (s: LeagueStatus) => void): () => void`, `forceRefresh(): Promise<LeagueStatus>`, and the three auth functions defined in Task 4 (declared now, wired in Task 4).
  - `statusLabel(status: LeagueStatus): string` in `apps/desktop/shared/status-label.ts` (imported by both main and renderer): CLOSED→"League is not running", STARTING→"League is starting…", CONNECTED→"Connected as {gameName}#{tagLine}", ERROR→"Error: {reason}".
  - `store.ts`: `electron-store` schema `{ pollIntervalMs: number (default 2000) }`.

- [ ] **Step 1:** Write `tests/status-label.test.ts` asserting the four strings above with `summoner.gameName='Hide on bush', tagLine='KR1'`.
- [ ] **Step 2:** Run it. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement `status-label.ts`. Run test. Expected: PASS.
- [ ] **Step 4:** Implement `main.ts`: single `BrowserWindow` 420×520, `webPreferences` per Global Constraints, load `http://localhost:5174` in dev (`VITE_DEV_SERVER_URL`) else `dist-renderer/index.html`; `startDetector({ intervalMs: store.get('pollIntervalMs'), onChange })` on `app.whenReady`, `onChange` sends `IPC.StatusChanged` to the window; `ipcMain.handle(IPC.GetStatus)` and `IPC.ForceRefresh` call the handle; `Tray` with template icon whose tooltip is `statusLabel(status)`; on `window-all-closed` keep running (tray app), quit from tray menu.
- [ ] **Step 5:** Implement `preload.ts` with `contextBridge.exposeInMainWorld('lpp', …)` and `renderer/bridge.d.ts` declaring `window.lpp`.
- [ ] **Step 6:** Implement renderer: `App.tsx` renders `StatusView` (label, big dot green/amber/red/grey, "Refresh" button, disclaimer paragraph in small text at the bottom). Plain CSS in `renderer/styles.css`: black background, system font, 16px gutter.
- [ ] **Step 7:** Scripts in `apps/desktop/package.json`: `dev:renderer` (`vite --port 5174`), `dev:main` (`tsc -p tsconfig.main.json --watch`), `dev:electron` (`electron .` with `VITE_DEV_SERVER_URL`), `dev` (concurrently all three), `build` (vite build + tsc), `typecheck`, `lint`, `test`. `"main": "dist-electron/electron/main.js"`.
- [ ] **Step 8:** Run `pnpm --filter @lpp/desktop dev` with League closed, then open League. Expected: window shows "League is not running" then "League is starting…" then "Connected as …". Log file created under `~/Library/Logs/LoLPersonalPerformance/`. Stop with Ctrl-C.
- [ ] **Step 9:** Run `pnpm -r typecheck && pnpm -r test`. Expected: PASS. Commit: `feat(desktop): electron shell with status bridge and tray`.

---

### Task 4: Supabase session in the main process

**Files:**
- Create: `apps/desktop/electron/auth/session-storage.ts`, `apps/desktop/electron/auth/supabase-main.ts`, `apps/desktop/electron/auth/auth-controller.ts`
- Modify: `apps/desktop/electron/main.ts`, `preload.ts`, `renderer/App.tsx`
- Create: `renderer/components/LoginView.tsx`
- Test: `apps/desktop/tests/session-storage.test.ts`, `apps/desktop/tests/auth-controller.test.ts`

**Interfaces:**
- Consumes: `IPC` auth channels (Task 3).
- Produces:
  - `createSessionStorage(deps: { encrypt(s: string): Buffer; decrypt(b: Buffer): string; filePath: string }): { getItem(k): Promise<string|null>; setItem(k, v): Promise<void>; removeItem(k): Promise<void> }` — a supabase-js `storage` adapter; values encrypted with Electron `safeStorage` and written as base64 JSON under `app.getPath('userData')/session.json`. `deps` injected so tests pass identity encrypt/decrypt and a temp file.
  - `createAuthController(client: SupabaseClient, emit: (state: AuthState) => void): { getState(): AuthState; signIn(email, password): Promise<{ error: string | null }>; signOut(): Promise<void>; start(): Promise<void> }` where `AuthState = { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; email: string; userId: string }`.
  - `window.lpp.auth.getState(): Promise<AuthState>`, `signIn(email, password): Promise<{ error: string | null }>`, `signOut(): Promise<void>`, `onStateChanged(cb): () => void`.

- [ ] **Step 1:** Write `session-storage.test.ts`: set then get round-trips through the injected encrypt/decrypt; get on missing key is `null`; remove deletes; a corrupt file yields `null` and does not throw.
- [ ] **Step 2:** Write `auth-controller.test.ts` with a fake client object (`auth.getSession`, `auth.signInWithPassword`, `auth.signOut`, `auth.onAuthStateChange`): `start()` with a stored session emits `signed-in`; `start()` whose `getSession` rejects with message `"Invalid Refresh Token"` calls `signOut({ scope: 'local' })` and emits `signed-out` (Review Focus 3); `signIn` with wrong password returns `{ error: 'Invalid login credentials' }` and state stays `signed-out`.
- [ ] **Step 3:** Run both. Expected: FAIL.
- [ ] **Step 4:** Implement the three modules. `supabase-main.ts` builds the client with `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })` reading env from `process.env` loaded via `dotenv` from `apps/desktop/.env`. Copy `isRefreshTokenError` from `~/Desktop/lol-app-ui/mobile-app/src/lib/auth-errors.ts` into `packages/shared/src/auth-errors.ts` with its test.
- [ ] **Step 5:** Run tests. Expected: PASS.
- [ ] **Step 6:** Wire in `main.ts`: create controller on ready, `ipcMain.handle` for the three auth channels, emit `IPC.AuthStateChanged`. The detector starts only when state is `signed-in` and stops on sign-out. Preload exposes `window.lpp.auth`.
- [ ] **Step 7:** `LoginView.tsx`: email + password fields, "Sign in" button, inline error text. `App.tsx`: `loading` → spinner, `signed-out` → `LoginView`, `signed-in` → `StatusView` with the email and a "Sign out" button.
- [ ] **Step 8:** Manual: `pnpm --filter @lpp/desktop dev`, sign in with the RiftLens test account, quit, relaunch. Expected: lands directly on `StatusView` without re-entering credentials; `session.json` content is not plaintext JWT (inspect with `cat`).
- [ ] **Step 9:** Add `apps/desktop/.env.example` with `SUPABASE_URL=`, `SUPABASE_ANON_KEY=`. Run `pnpm -r typecheck && pnpm -r test`. Commit: `feat(desktop): supabase session in main process with safeStorage`.

---

### Task 5: Expo app with sign-in and sign-up

**Files:**
- Create: `apps/mobile/` via `pnpm create expo-app@latest apps/mobile --template blank-typescript` then add `expo-router`, `expo-secure-store`, `react-native-url-polyfill`, `@supabase/supabase-js`, `@tanstack/react-query`
- Create: `apps/mobile/src/lib/supabase.ts`, `src/lib/auth-context.tsx`, `src/app/_layout.tsx`, `src/app/index.tsx`, `src/app/(auth)/_layout.tsx`, `src/app/(auth)/sign-in.tsx`, `src/app/(auth)/sign-up.tsx`, `src/theme/tokens.ts`
- Test: `apps/mobile/tests/route-guard.test.ts`

**Interfaces:**
- Consumes: `isRefreshTokenError` from `@lpp/shared` (Task 4).
- Produces:
  - `supabase` client (copy of `~/Desktop/lol-app-ui/mobile-app/src/lib/supabase.ts`, including the `TOKEN_REFRESHED` → `realtime.setAuth` hook).
  - `AuthProvider`, `useAuth(): { user: User | null; session: Session | null; loading: boolean }` (copy of RiftLens `auth-context.tsx`).
  - `resolveEntryRoute(input: { loading: boolean; signedIn: boolean; linked: boolean | null }): '/(auth)/sign-in' | '/(app)/link' | '/(app)/matches' | null` in `src/lib/route-guard.ts` (`null` while loading or while `linked` is unknown and signed in).
  - `tokens.ts`: `colors = { bg: '#000000', surface: '#111214', text: '#F5F5F7', muted: '#8E8E93', win: '#4CD964', loss: '#FF6B6B', accent: '#C8AA6E' }`, `space = { xs: 4, sm: 8, md: 16, lg: 24 }`, `font = { title: 28, body: 17, caption: 13 }`.

- [ ] **Step 1:** Scaffold with `create-expo-app`, move to `src/app` layout per Expo Router docs, set `"main": "expo-router/entry"`, scheme `lpp`. Add `@lpp/shared: workspace:*`; configure Metro for pnpm workspaces per Expo monorepo docs (`watchFolders`, `nodeModulesPaths`).
- [ ] **Step 2:** Write `tests/route-guard.test.ts` (Vitest, node env): loading → `null`; signed out → sign-in; signed in + `linked: null` → `null`; signed in + `linked: false` → link; signed in + `linked: true` → matches.
- [ ] **Step 3:** Run. Expected: FAIL. Implement `route-guard.ts`. Expected: PASS.
- [ ] **Step 4:** Implement `supabase.ts`, `auth-context.tsx`, `_layout.tsx` (AuthProvider + QueryClientProvider, dark status bar, background `colors.bg`), `index.tsx` (uses `resolveEntryRoute` with `linked: null` for now and `<Redirect>`), `(auth)/sign-in.tsx` and `sign-up.tsx` (email, password, button, error text, link to the other screen; `signUp` success shows "Check your email to confirm" if `session` is null).
- [ ] **Step 5:** `apps/mobile/.env.example` with the two `EXPO_PUBLIC_` vars. Run `pnpm --filter @lpp/mobile exec expo start --ios`. Expected: sign-in renders on simulator; wrong password shows error; correct credentials navigate (to a placeholder, since Task 6 adds the app routes, `index.tsx` may redirect to sign-in only for now).
- [ ] **Step 6:** `pnpm -r typecheck && pnpm -r test`. Commit: `feat(mobile): expo app with supabase auth`.

---

### Task 6: Riot ID link screen and the two tabs

**Files:**
- Create: `apps/mobile/src/app/(app)/_layout.tsx` (Tabs), `(app)/matches.tsx`, `(app)/live.tsx`, `(app)/link.tsx`
- Create: `src/lib/linked-account.ts`, `src/hooks/useLinkedAccount.ts`, `src/components/Disclaimer.tsx`, `src/components/RegionPicker.tsx`
- Modify: `src/app/index.tsx`
- Test: `apps/mobile/tests/linked-account.test.ts`

**Interfaces:**
- Consumes: `parseRiotId`, `REGIONS`, `platformToRegion`, `RIOT_DISCLAIMER` (Task 1); `supabase`, `useAuth`, `resolveEntryRoute` (Task 5).
- Produces:
  - `type LinkedAccount = { puuid: string; gameName: string; tagLine: string; region: Region }`
  - `fetchLinkedAccount(client, userId: string): Promise<LinkedAccount | null>` — `from('linked_riot_accounts').select('puuid, riot_id_game_name, riot_id_tag_line, platform, last_seen_at').eq('user_id', userId).order('last_seen_at', { ascending: false }).limit(1)`; empty → `null`.
  - `linkRiotAccount(client, input: { gameName: string; tagLine: string; region: Region }): Promise<{ ok: true; puuid: string } | { ok: false; code: 'NOT_FOUND' | 'RATE_LIMITED' | 'IDENTITY_MISSING' | 'UNKNOWN' }>` — `client.functions.invoke('link-riot-account', { body })`; maps HTTP 404 → `NOT_FOUND`, 429 → `RATE_LIMITED`, body `error` field otherwise.
  - `useLinkedAccount(): { data: LinkedAccount | null | undefined; refetch }` (TanStack Query, key `['linked-account', userId]`).

- [ ] **Step 1:** Write `tests/linked-account.test.ts` with a fake client: empty rows → `null` (Review Focus 4); row with `platform: 'euw1'` → `region: 'EUW'`; `linkRiotAccount` maps a 404 response to `{ ok: false, code: 'NOT_FOUND' }` and a 429 to `RATE_LIMITED` (Review Focus 5); success returns the `puuid` from the body.
- [ ] **Step 2:** Run. Expected: FAIL. Implement `linked-account.ts`. Expected: PASS.
- [ ] **Step 3:** `link.tsx`: one text field "Riot ID (Name#TAG)", `RegionPicker` (segmented list of `REGIONS`, default `NA`), "Link account" button. Uses `parseRiotId`; empty parse shows "Enter your Riot ID as Name#TAG". Error messages: NOT_FOUND → "That Riot ID was not found in {region}", RATE_LIMITED → "Riot is busy, try again in a minute", other → "Could not link, try again". On success `refetch()` and `router.replace('/(app)/matches')`.
- [ ] **Step 4:** `(app)/_layout.tsx`: `Tabs` with exactly two screens, titles `Matches` and `Live`, dark tab bar using tokens; `link.tsx` is a hidden route (`href: null`). `matches.tsx` and `live.tsx`: title, one line of placeholder copy ("Your recent matches will appear here." / "Sign in on the desktop app to see live stats."), `Disclaimer` at the bottom, "Sign out" in a header button on Matches.
- [ ] **Step 5:** `index.tsx`: `resolveEntryRoute({ loading, signedIn: !!user, linked: data === undefined ? null : data !== null })`.
- [ ] **Step 6:** Manual on simulator: fresh sign-in → link screen; link a real Riot ID → Matches tab; kill and relaunch → straight to Matches. On iPad simulator both tabs render with the 16px gutter and no horizontal scroll.
- [ ] **Step 7:** `pnpm -r typecheck && pnpm -r test`. Commit: `feat(mobile): riot id linking and matches/live tabs`.

---

### Task 7: Phase 1 acceptance and progress report

**Files:**
- Modify: `DEVELOPMENT_PROGRESS.md`, `README.md`

- [ ] **Step 1:** Run `grep -rn "RGAPI-" apps packages --include='*.ts' --include='*.tsx' --include='*.json'`. Expected: no matches.
- [ ] **Step 2:** Run `pnpm --filter @lpp/desktop build` then `grep -c "SUPABASE_ANON_KEY\|eyJ" apps/desktop/dist-renderer/assets/*.js`. Expected: the anon key may appear (it is public); no `service_role` string, no `RGAPI`.
- [ ] **Step 3:** Full acceptance in one sitting: desktop signed in and showing `Connected as …` with League open; mobile signed in with the same account on the tabs. Record the three commands used and the result.
- [ ] **Step 4:** Update `DEVELOPMENT_PROGRESS.md`: tick Phase 1 tasks, add "Verified on 2026-MM-DD" with macOS and Expo SDK versions, list limitations (macOS only, tabs are placeholders, no Riot data yet). Update README dev commands.
- [ ] **Step 5:** `pnpm -r lint && pnpm -r typecheck && pnpm -r test`. Commit: `docs: phase 1 progress report`.
