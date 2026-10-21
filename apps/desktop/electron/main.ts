import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron'
import path from 'node:path'
import type { LeagueStatus } from '@lpp/shared'
import { IPC } from './ipc/channels'
import { store } from './store'
import { startDetector, type DetectorHandle } from './league/detector'
import { statusLabel } from '../shared/status-label'
import { logger } from './logger'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let detector: DetectorHandle | null = null
let lastStatus: LeagueStatus = { state: 'CLOSED' }

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

ipcMain.handle(IPC.GetStatus, () => lastStatus)
ipcMain.handle(IPC.ForceRefresh, async () => (detector ? detector.forceTick() : lastStatus))

void app.whenReady().then(() => {
  tray = createTray()
  mainWindow = createWindow()
  startCollector()
})

// Tray app: closing the window keeps the collector running.
app.on('window-all-closed', () => {
  /* keep running */
})

app.on('activate', () => {
  showWindow()
})
