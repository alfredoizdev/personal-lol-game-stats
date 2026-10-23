import { describe, expect, it } from 'vitest'
import { appLoadState } from '@/lib/app-load'

const base = { idsPending: false, total: 100, loaded: 0, running: true, wasReady: false }

describe('appLoadState (one loading screen at launch; every game loads before any tab shows)', () => {
  it('loads while the id list is pending', () => {
    expect(appLoadState({ ...base, idsPending: true, total: 0, running: false })).toBe('loading')
  })
  it('holds the tabs until EVERY game in the window is loaded, so no number moves on screen afterwards', () => {
    expect(appLoadState({ ...base, loaded: 20 })).toBe('loading')
    expect(appLoadState({ ...base, loaded: 99 })).toBe('loading')
    expect(appLoadState({ ...base, loaded: 100 })).toBe('ready')
    expect(appLoadState({ ...base, total: 7, loaded: 7, running: false })).toBe('ready')
  })
  it('never blocks on nothing: no games, or a run that stopped short, shows the tabs (they explain and offer Retry)', () => {
    expect(appLoadState({ ...base, total: 0, running: false })).toBe('ready')
    expect(appLoadState({ ...base, loaded: 60, running: false })).toBe('ready')
  })
  it('once ready for this account, stays ready (a later refetch never flashes the loading screen)', () => {
    expect(appLoadState({ ...base, idsPending: true, loaded: 0, wasReady: true })).toBe('ready')
  })
})
