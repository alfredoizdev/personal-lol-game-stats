import type { LppBridge } from '../electron/preload'

declare global {
  interface Window {
    lpp: LppBridge
  }
}

export {}
