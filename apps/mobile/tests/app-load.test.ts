import { describe, expect, it } from 'vitest'
import { appLoadState, FIRST_READY } from '@/lib/app-load'

const base = { idsPending: false, total: 100, loadedInFirst: 0, running: true, wasReady: false }

describe('appLoadState (one loading screen at launch; the games load once for every tab)', () => {
  it('loads while the id list is pending', () => {
    expect(appLoadState({ ...base, idsPending: true, total: 0, running: false })).toBe('loading')
  })
  it('loads until the first 20 games are ready, then the tabs show while the rest keeps loading', () => {
    expect(FIRST_READY).toBe(20)
    expect(appLoadState({ ...base, loadedInFirst: 19 })).toBe('loading')
    expect(appLoadState({ ...base, loadedInFirst: 20 })).toBe('ready')
    expect(appLoadState({ ...base, total: 7, loadedInFirst: 7 })).toBe('ready')
  })
  it('never blocks on nothing: no games, or a run that stopped short, shows the tabs (they explain and offer Retry)', () => {
    expect(appLoadState({ ...base, total: 0, running: false })).toBe('ready')
    expect(appLoadState({ ...base, loadedInFirst: 12, running: false })).toBe('ready')
  })
  it('once ready for this account, stays ready (a later refetch never flashes the loading screen)', () => {
    expect(appLoadState({ ...base, idsPending: true, loadedInFirst: 0, wasReady: true })).toBe('ready')
  })
})
