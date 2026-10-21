import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import type { LeagueStatus } from '@lpp/shared'
import { IPC } from './ipc/channels'
import { createMainSupabaseClient } from './auth/supabase-main'
import { createAuthController, type AuthController, type AuthState } from './auth/auth-controller'
import { store } from './store'
import { startDetector, type DetectorHandle } from './league/detector'
import { statusLabel } from '../shared/status-label'
import { logger } from './logger'

loadEnv({ path: path.join(app.getAppPath(), '.env') })

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let detector: DetectorHandle | null = null
let lastStatus: LeagueStatus = { state: 'CLOSED' }
let auth: AuthController | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    title: 'LoL Personal Performance',
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
  if (state.status === 'signed-in') startCollector()
  else if (state.status === 'signed-out' && detector) stopCollector()
}

ipcMain.handle(IPC.GetStatus, () => lastStatus)
ipcMain.handle(IPC.ForceRefresh, async () => (detector ? detector.forceTick() : lastStatus))
ipcMain.handle(IPC.AuthGetState, () => auth?.getState() ?? { status: 'loading' })
ipcMain.handle(IPC.AuthSignIn, (_e, { email, password }: { email: string; password: string }) =>
  auth ? auth.signIn(String(email), String(password)) : { error: 'Auth not ready' },
)
ipcMain.handle(IPC.AuthSignOut, () => auth?.signOut())

void app.whenReady().then(async () => {
  tray = createTray()
  mainWindow = createWindow()
  auth = createAuthController(createMainSupabaseClient(), onAuthState)
  await auth.start()
})

// Tray app: closing the window keeps the collector running.
app.on('window-all-closed', () => {
  /* keep running */
})

app.on('activate', () => {
  showWindow()
})
