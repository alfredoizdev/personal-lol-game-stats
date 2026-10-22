import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import type { LeagueStatus } from '@lpp/shared'
import { IPC } from './ipc/channels'
import { createMainSupabaseClient } from './auth/supabase-main'
import { createAuthController, type AuthController, type AuthState } from './auth/auth-controller'
import { store } from './store'
import { startDetector, type DetectorHandle } from './league/detector'
import { readLockfile } from './league/lockfile'
import type { LockfileData } from './league/lockfile'
import { startLivePoller, type LivePollerHandle, type LiveState } from './league/live-poller'
import { createLivePublisher, type LivePublisher } from './live/live-publisher'
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
let lastLive: LiveState = { kind: 'idle' }
let lockfileCache: LockfileData | null = null

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
  win.on('closed', () => {
    mainWindow = null
  })
  return win
}

function showWindow(): void {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    return
  }
  mainWindow = createWindow()
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
    stopLive()
  }
}

function onLiveState(state: LiveState): void {
  lastLive = state
  logger.info(`live: ${liveLabel(state)}`)
  mainWindow?.webContents.send(IPC.LiveChanged, state)
  if ((state.kind === 'live' || state.kind === 'ended') && publisher) {
    publisher.publish(state.snapshot).catch((err) => logger.warn(`publish failed: ${String(err)}`))
  }
}

/** Live poller + publisher run only while signed in AND League is connected. */
function startLive(): void {
  if (livePoller || !supabaseClient || !userId) return
  publisher = publisher ?? createLivePublisher(supabaseClient, userId)
  livePoller = startLivePoller({
    getLockfile: () => lockfileCache,
    identity: () => (lastStatus.state === 'CONNECTED' ? { gameName: lastStatus.summoner.gameName, tagLine: lastStatus.summoner.tagLine } : null),
    focus: () => null,
    onChange: onLiveState,
  })
  logger.info('live poller started')
}

function stopLive(): void {
  livePoller?.stop()
  livePoller = null
  if (lastLive.kind !== 'idle') onLiveState({ kind: 'idle' })
}

function createTray(): Tray {
  const icon = nativeImage.createFromPath(path.join(app.getAppPath(), 'assets', 'trayTemplate.png'))
  icon.setTemplateImage(true)
  const t = new Tray(icon)
  t.setToolTip(statusLabel(lastStatus))
  t.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open', click: () => showWindow() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  )
  t.on('click', () => showWindow())
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
  } else if (state.status === 'signed-out') {
    userId = null
    stopLive()
    void publisher?.stop()
    publisher = null
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
  tray = createTray()
  mainWindow = createWindow()
  supabaseClient = createMainSupabaseClient()
  auth = createAuthController(supabaseClient, onAuthState)
  await auth.start()
})

// Tray app: closing the window keeps the collector running.
app.on('window-all-closed', () => {
  /* keep running */
})

app.on('activate', () => {
  showWindow()
})
