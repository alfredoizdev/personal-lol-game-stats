import { describe, expect, it } from 'vitest'
import { activeRole, goalEditorInitial, homeRole, prepareHeadline } from '@/lib/prepare-view'

describe('activeRole (which role Prepare shows)', () => {
  it('is the role champion select assigned when there is one', () => {
    expect(activeRole({ pick: { championId: null, position: 'UTILITY' }, viewing: 'MIDDLE', primary: 'TOP' })).toBe('UTILITY')
  })
  it('falls back to the role you are viewing, then your primary role', () => {
    expect(activeRole({ pick: { championId: 238, position: null }, viewing: 'BOTTOM', primary: 'TOP' })).toBe('BOTTOM')
    expect(activeRole({ pick: null, viewing: null, primary: 'TOP' })).toBe('TOP')
  })
})

describe('prepareHeadline (the champion select line)', () => {
  it('is null outside champion select', () => {
    expect(prepareHeadline(null, null)).toBeNull()
  })
  it('names the assigned role and the locked champion as they arrive', () => {
    expect(prepareHeadline({ championId: null, position: null }, null)).toBe('Champion select')
    expect(prepareHeadline({ championId: null, position: 'MIDDLE' }, null)).toBe('Champion select · Mid')
    expect(prepareHeadline({ championId: 238, position: 'MIDDLE' }, 'Zed')).toBe('Playing Zed · Mid')
    expect(prepareHeadline({ championId: 238, position: 'UTILITY' }, 'Zed')).toBe('Playing Zed · Support')
  })
})

describe('homeRole (the role Prepare shows by itself, nothing to choose)', () => {
  const g = (role: string) => ({ me: { role }, queueId: 420, remake: false }) as never
  it('is your most played role', () => {
    expect(homeRole([g('MIDDLE'), g('UTILITY'), g('UTILITY')])).toBe('UTILITY')
  })
  it('is mid before any game is loaded', () => {
    expect(homeRole([])).toBe('MIDDLE')
  })
})

describe('goalEditorInitial (where the one editor starts, 2026-10-26)', () => {
  it('starts on "recommended for my role" with no saved goal or a recommended one', () => {
    expect(goalEditorInitial(null)).toEqual({ mode: 'recommended', metric: null })
    expect(goalEditorInitial({ metric: 'csPerMin', target: null })).toEqual({ mode: 'recommended', metric: null })
  })
  it('starts on the fixed metric and number the player saved', () => {
    expect(goalEditorInitial({ metric: 'deathsPer10', target: 1.2 })).toEqual({ mode: 'fixed', metric: 'deathsPer10', target: 1.2 })
  })
})
