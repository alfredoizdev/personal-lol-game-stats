import { describe, expect, it } from 'vitest'
import { champSelectNavigation, type ChampSelectObservation } from '@/lib/champ-select-nav'

const cs = (since: number): ChampSelectObservation => ({ phase: 'ChampSelect', since })
const other = (phase: ChampSelectObservation['phase']): ChampSelectObservation => ({ phase, since: 0 })

describe('champSelectNavigation (the champion select screen opens and closes by itself)', () => {
  it('opens on the transition into champion select, never on the first observation', () => {
    expect(champSelectNavigation({ prev: other('ReadyCheck'), next: cs(10), onScreen: false, dismissedSince: null })).toBe('open')
    expect(champSelectNavigation({ prev: null, next: cs(10), onScreen: false, dismissedSince: null })).toBe('none')
  })
  it('does not reopen the same champion select once the player dismissed it, but opens the next one', () => {
    expect(champSelectNavigation({ prev: cs(10), next: cs(10), onScreen: false, dismissedSince: 10 })).toBe('none')
    expect(champSelectNavigation({ prev: other('Lobby'), next: cs(20), onScreen: false, dismissedSince: 10 })).toBe('open')
  })
  it('closes when the phase leaves champion select while the screen is showing', () => {
    expect(champSelectNavigation({ prev: cs(10), next: other('GameStart'), onScreen: true, dismissedSince: null })).toBe('close')
    expect(champSelectNavigation({ prev: cs(10), next: other('Lobby'), onScreen: true, dismissedSince: null })).toBe('close')
    expect(champSelectNavigation({ prev: cs(10), next: other('GameStart'), onScreen: false, dismissedSince: null })).toBe('none')
  })
  it('stays put while champion select continues', () => {
    expect(champSelectNavigation({ prev: cs(10), next: cs(10), onScreen: true, dismissedSince: null })).toBe('none')
  })
})
