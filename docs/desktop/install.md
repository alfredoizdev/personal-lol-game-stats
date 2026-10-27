# LanePulse desktop companion — packaged app (macOS)

The companion no longer needs the dev servers: `pnpm dist` produces a
self-contained `.app` with the renderer, the main process, the shared package
and the three runtime dependencies inside `app.asar`.

## Build

```
cd apps/desktop
pnpm dist
```

Output in `apps/desktop/release/` (git-ignored):

- `LanePulse-0.1.0-arm64.dmg` — the installer (Apple Silicon).
- `LanePulse-0.1.0-arm64.zip` — the same app zipped.
- `mac-arm64/LanePulse.app` — the app itself.

`.env` (Supabase URL and anon key, nothing else) is packed into the app so it
runs without the repository. The anon key is the public client key the phone
app also ships; the Riot key stays in Supabase.

## Install and first launch

1. Open the `.dmg` and drag LanePulse to Applications.
2. The app is ad-hoc signed, not notarized (Phase 9 will add the Developer ID
   signature). On first launch macOS may refuse it: right-click the app →
   Open → Open, or System Settings → Privacy & Security → "Open Anyway".
3. Sign in with the same LanePulse account as the phone. The packaged app
   keeps its own session and settings (`~/Library/Application Support/LanePulse`),
   separate from the dev build.

The app lives in the menu bar; closing the window hides it and the collector
keeps running. Quit from the tray menu.

## Notes

- Electron version is pinned in `package.json` → `build.electronVersion`
  because electron-builder needs an exact release; bump it together with the
  `electron` devDependency.
- `@lpp/shared` is a devDependency of the desktop app: `tsc` + `tsc-alias`
  compile it into `dist-electron`, so it is not needed in the packed
  `node_modules`.
- The demo feed (`LPP_LIVE_DEMO=1`) is disabled in packaged builds
  (`!app.isPackaged`).
- Icon: electron-builder's default Electron icon until an app icon is added
  to `apps/desktop/assets` (`icon.icns`) and `build.mac.icon`.
