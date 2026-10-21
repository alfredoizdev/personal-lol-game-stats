import { contextBridge, ipcRenderer } from 'electron'
import type { LeagueStatus } from '@lpp/shared'

// Inlined copy of electron/ipc/channels.ts: a sandboxed preload cannot
// require() relative modules. Keep both in sync.
const IPC = {
  GetStatus: 'lpp:get-status',
  StatusChanged: 'lpp:status-changed',
  ForceRefresh: 'lpp:force-refresh',
  AuthGetState: 'lpp:auth-get-state',
  AuthSignIn: 'lpp:auth-sign-in',
  AuthSignOut: 'lpp:auth-sign-out',
  AuthStateChanged: 'lpp:auth-state-changed',
} as const

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; email: string; userId: string }

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  getStatus: (): Promise<LeagueStatus> => ipcRenderer.invoke(IPC.GetStatus),
  forceRefresh: (): Promise<LeagueStatus> => ipcRenderer.invoke(IPC.ForceRefresh),
  onStatusChanged: (cb: (status: LeagueStatus) => void): (() => void) =>
    subscribe<LeagueStatus>(IPC.StatusChanged, cb),
  auth: {
    getState: (): Promise<AuthState> => ipcRenderer.invoke(IPC.AuthGetState),
    signIn: (email: string, password: string): Promise<{ error: string | null }> =>
      ipcRenderer.invoke(IPC.AuthSignIn, { email, password }),
    signOut: (): Promise<void> => ipcRenderer.invoke(IPC.AuthSignOut),
    onStateChanged: (cb: (state: AuthState) => void): (() => void) =>
      subscribe<AuthState>(IPC.AuthStateChanged, cb),
  },
}

export type LppBridge = typeof api

contextBridge.exposeInMainWorld('lpp', api)
