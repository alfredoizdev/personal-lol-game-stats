import { describe, expect, it } from 'vitest'
import { activeRole, goalEditorInitial, homeRole, pickedPortrait, prepareHeadline, standingTarget } from '@/lib/prepare-view'

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

describe('goalEditorInitial (where the one editor starts, 2026-10-27: you pick the metric, the number follows the role)', () => {
  it("starts on the shown role's first metric at the recommended value with nothing saved", () => {
    expect(goalEditorInitial(null, 'UTILITY')).toEqual({ metric: 'visionPerMin', target: null })
    expect(goalEditorInitial(null, 'JUNGLE')).toEqual({ metric: 'kpPct', target: null })
  })
  it('starts on the saved metric, recommended or fixed', () => {
    expect(goalEditorInitial({ metric: 'csPerMin', target: null }, 'UTILITY')).toEqual({ metric: 'csPerMin', target: null })
    expect(goalEditorInitial({ metric: 'deathsPer10', target: 1.2 }, 'TOP')).toEqual({ metric: 'deathsPer10', target: 1.2 })
  })
})

describe('standingTarget (what Save goal stores)', () => {
  it('stores null (the number follows the role) while the value is the recommended one', () => {
    expect(standingTarget(7, 7)).toBeNull()
  })
  it('stores the number once the player moved away from it', () => {
    expect(standingTarget(7.5, 7)).toBe(7.5)
    expect(standingTarget(7.5, null)).toBe(7.5)
  })
})

describe('pickedPortrait (the champion avatar beside the champion select line, owner 2026-10-29)', () => {
  const zed = { id: 238, name: 'Zed', imageKey: 'Zed' }
  it('is the Data Dragon image key of the locked champion', () => {
    expect(pickedPortrait({ championId: 238, position: 'MIDDLE' }, zed)).toBe('Zed')
  })
  it('is null before a champion is locked, outside champion select, or when the champion list has not loaded', () => {
    expect(pickedPortrait({ championId: null, position: 'MIDDLE' }, null)).toBeNull()
    expect(pickedPortrait(null, zed)).toBeNull()
    expect(pickedPortrait({ championId: 238, position: 'MIDDLE' }, null)).toBeNull()
  })
})
