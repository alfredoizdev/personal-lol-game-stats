import { describe, expect, it } from 'vitest'
import { activeRole, homeRole, prepareHeadline, standingTarget } from '@/lib/prepare-view'

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

describe('standingTarget (what Save goal stores)', () => {
  it('stores null (recommended for the role you play) while the value is the recommended one', () => {
    expect(standingTarget(7, 7)).toBeNull()
  })
  it('stores the number once the player moved away from it', () => {
    expect(standingTarget(7.5, 7)).toBe(7.5)
    expect(standingTarget(7.5, null)).toBe(7.5)
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
