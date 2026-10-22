/** IPC channel names. Mirrored verbatim in preload.ts (sandboxed preload cannot require this file). */
export const IPC = {
  GetStatus: 'lpp:get-status',
  StatusChanged: 'lpp:status-changed',
  ForceRefresh: 'lpp:force-refresh',
  AuthGetState: 'lpp:auth-get-state',
  AuthSignIn: 'lpp:auth-sign-in',
  AuthSignOut: 'lpp:auth-sign-out',
  AuthStateChanged: 'lpp:auth-state-changed',
  GetLive: 'lpp:get-live',
  LiveChanged: 'lpp:live-changed',
} as const
