import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen } from 'electron'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { buildLivePhase, type GameflowPhase, type LeagueStatus } from '@lpp/shared'
import { IPC } from './ipc/channels'
import { createMainSupabaseClient } from './auth/supabase-main'
import { createAuthController, type AuthController, type AuthState } from './auth/auth-controller'
import { store } from './store'
import { startDetector, type DetectorHandle } from './league/detector'
import { readLockfile } from './league/lockfile'
import type { LockfileData } from './league/lockfile'
import { startLivePoller, type LivePollerHandle, type LiveState } from './league/live-poller'
import { createLivePublisher, type LivePublisher } from './live/live-publisher'
import { createDemoDeps } from './live/demo-feed'
import { createGoalPush, type GoalPush } from './notify/goal-push'
import { createChampionLookup } from './notify/champions'
import type { SupabaseClient } from '@supabase/supabase-js'
import { liveLabel, statusLabel } from '../shared/status-label'
import { logger } from './logger'

loadEnv({ path: path.join(app.getAppPath(), '.env') })

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let detector: DetectorHandle | null = null
let lastStatus: LeagueStatus = { state: 'CLOSED' }
let auth: AuthController | null = null
let supabaseClient: SupabaseClient | null = null
let userId: string | null = null
let livePoller: LivePollerHandle | null = null
let publisher: LivePublisher | null = null
let goalPush: GoalPush | null = null
const champions = createChampionLookup(globalThis.fetch)
let lastLive: LiveState = { kind: 'idle' }
let phaseNow: GameflowPhase = 'None'
let phaseSince = Date.now()
let phaseHeartbeat: NodeJS.Timeout | null = null
const PHASE_HEARTBEAT_MS = 10_000
let lockfileCache: LockfileData | null = null
let quitting = false

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    title: 'LanePulse',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })
  win.setMenuBarVisibility(false)
  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(path.join(app.getAppPath(), 'dist-renderer', 'index.html'))
  }
  // Menu-bar app: closing the window only hides it; the collector keeps running.
  win.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    win.hide()
  })
  win.on('closed', () => {
    mainWindow = null
  })
  return win
}

/** Place the window just below the tray icon (menu-bar popover feel), kept inside that display. */
function positionUnderTray(win: BrowserWindow): void {
  const b = tray?.getBounds()
  if (!b || b.width === 0 || b.height === 0) return // bounds unknown (e.g. before first layout): keep default position
  const { width, height } = win.getBounds()
  const area = screen.getDisplayNearestPoint({ x: b.x, y: b.y }).workArea
  const x = Math.min(Math.max(Math.round(b.x + b.width / 2 - width / 2), area.x), area.x + area.width - width)
  const y = Math.min(Math.round(b.y + b.height + 4), area.y + area.height - height)
  win.setPosition(x, y, false)
}

function showWindow(): void {
  if (!mainWindow) mainWindow = createWindow()
  positionUnderTray(mainWindow)
  mainWindow.show()
  mainWindow.focus()
}

function toggleWindow(): void {
  if (mainWindow?.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide()
    return
  }
  showWindow()
}

function broadcastStatus(status: LeagueStatus): void {
  lastStatus = status
  logger.info(`status: ${statusLabel(status)}`)
  tray?.setToolTip(statusLabel(status))
  mainWindow?.webContents.send(IPC.StatusChanged, status)
  if (status.state === 'CONNECTED') {
    void readLockfile().then((lf) => {
      lockfileCache = lf
    })
    startLive()
  } else {
    lockfileCache = null
    if (!isDemo()) stopLive()
  }
}

/** DEV ONLY: scripted live feed, independent of League (see live/demo-feed.ts). */
function isDemo(): boolean {
  return process.env.LPP_LIVE_DEMO === '1' && !app.isPackaged
}

/** The client phase the phone shows before and after a game; re-sent every 10 s so a stale phone can tell. */
function publishPhase(): void {
  if (!publisher) return
  publisher.publishPhase(buildLivePhase(phaseNow, Date.now() - phaseSince, Date.now())).catch((err) => logger.warn(`phase publish failed: ${String(err)}`))
}

function onLiveState(state: LiveState): void {
  lastLive = state
  logger.info(`live: ${liveLabel(state)}`)
  mainWindow?.webContents.send(IPC.LiveChanged, state)
  if ((state.kind === 'live' || state.kind === 'ended') && publisher) {
    publisher.publish(state.snapshot).catch((err) => logger.warn(`publish failed: ${String(err)}`))
  }
  if (state.kind === 'waiting' || state.kind === 'idle') {
    const next: GameflowPhase = state.kind === 'waiting' ? state.phase : (state.phase ?? 'None')
    if (next !== phaseNow) {
      phaseNow = next
      phaseSince = Date.now()
    }
    publishPhase()
  } else if (state.kind === 'live') {
    phaseNow = 'InProgress'
  }
  void goalPush?.onLiveState(state) // never throws; the poller does not wait for the network
}

/** The Riot ID League is signed in with; the demo feed plays as the first linked account's owner. */
function lcuIdentity(): { gameName: string; tagLine: string } | null {
  return lastStatus.state === 'CONNECTED' ? { gameName: lastStatus.summoner.gameName, tagLine: lastStatus.summoner.tagLine } : null
}

/** Live poller + publisher run only while signed in AND League is connected. */
function startLive(): void {
  if (livePoller || !supabaseClient || !userId) return
  publisher =
    publisher ??
    createLivePublisher(supabaseClient, userId, {
      // A phone that just connected asks where we are: answer at once instead of making it wait for the heartbeat.
      onPing: () => {
        publishPhase()
        if (lastLive.kind === 'live' || lastLive.kind === 'ended') void publisher?.resend().catch((err) => logger.warn(`resend failed: ${String(err)}`))
      },
    })
  goalPush = goalPush ?? createGoalPush(supabaseClient, userId, { log: logger, champions, identity: lcuIdentity })
  const demo = isDemo()
  const identity = () =>
    lastStatus.state === 'CONNECTED'
      ? { gameName: lastStatus.summoner.gameName, tagLine: lastStatus.summoner.tagLine }
      : demo
        ? { gameName: 'Demo', tagLine: 'LPP' }
        : null
  livePoller = startLivePoller({
    getLockfile: () => (demo ? { port: 0, password: '', protocol: 'https' } : lockfileCache),
    identity,
    focus: () => null,
    onChange: onLiveState,
    deps: demo ? createDemoDeps({ appPath: app.getAppPath(), identity }) : undefined,
  })
  phaseHeartbeat = phaseHeartbeat ?? setInterval(() => {
    if (lastLive.kind === 'waiting' || lastLive.kind === 'idle') publishPhase()
  }, PHASE_HEARTBEAT_MS)
  logger.info(demo ? 'live poller started (DEMO feed)' : 'live poller started')
}

function stopLive(): void {
  livePoller?.stop()
  livePoller = null
  goalPush?.reset()
  if (phaseHeartbeat) clearInterval(phaseHeartbeat)
  phaseHeartbeat = null
  if (lastLive.kind !== 'idle') onLiveState({ kind: 'idle' })
}

function createTray(): Tray {
  const icon = nativeImage.createFromPath(path.join(app.getAppPath(), 'assets', 'trayTemplate.png'))
  icon.setTemplateImage(true)
  const t = new Tray(icon)
  t.setToolTip(statusLabel(lastStatus))
  t.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open LanePulse', click: () => showWindow() },
      { type: 'separator' },
      { label: 'Quit LanePulse', click: () => app.quit() },
    ]),
  )
  t.on('click', () => toggleWindow())
  return t
}

export function startCollector(): void {
  if (detector) return
  detector = startDetector({
    intervalMs: store.get('pollIntervalMs'),
    onChange: broadcastStatus,
  })
  logger.info('detector started')
}

export function stopCollector(): void {
  detector?.stop()
  detector = null
  broadcastStatus({ state: 'CLOSED' })
  logger.info('detector stopped')
}

/** The collector only runs while a user is signed in. */
function onAuthState(state: AuthState): void {
  logger.info(`auth: ${state.status}`)
  mainWindow?.webContents.send(IPC.AuthStateChanged, state)
  if (state.status === 'signed-in') {
    userId = state.userId
    startCollector()
    if (isDemo()) startLive() // demo does not wait for League
  } else if (state.status === 'signed-out') {
    userId = null
    stopLive()
    void publisher?.stop()
    publisher = null
    goalPush = null
    if (detector) stopCollector()
  }
}

ipcMain.handle(IPC.GetStatus, () => lastStatus)
ipcMain.handle(IPC.ForceRefresh, async () => (detector ? detector.forceTick() : lastStatus))
ipcMain.handle(IPC.AuthGetState, () => auth?.getState() ?? { status: 'loading' })
ipcMain.handle(IPC.AuthSignIn, (_e, { email, password }: { email: string; password: string }) =>
  auth ? auth.signIn(String(email), String(password)) : { error: 'Auth not ready' },
)
ipcMain.handle(IPC.AuthSignOut, () => auth?.signOut())
ipcMain.handle(IPC.GetLive, () => lastLive)

void app.whenReady().then(async () => {
  app.dock?.hide() // lives in the menu bar, not the Dock
  tray = createTray()
  mainWindow = createWindow()
  mainWindow.center()
  supabaseClient = createMainSupabaseClient()
  auth = createAuthController(supabaseClient, onAuthState)
  await auth.start()
})

// Tray app: closing the window keeps the collector running.
app.on('window-all-closed', () => {
  /* keep running */
})

app.on('before-quit', () => {
  quitting = true
})

app.on('activate', () => {
  showWindow()
})
