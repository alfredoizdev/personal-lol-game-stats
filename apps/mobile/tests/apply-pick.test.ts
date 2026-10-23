import { describe, it, expect } from 'vitest'
import { applyPick } from '../src/lib/apply-pick'

describe('applyPick (Prepare follows your champion select)', () => {
  it('takes the assigned role and the locked champion from the pick', () => {
    expect(applyPick({ role: 'BOTTOM', championId: 51 }, { championId: 238, position: 'MIDDLE' })).toEqual({ role: 'MIDDLE', championId: 238 })
  })
  it('keeps the current champion while none is locked yet, and the current role when the mode has none', () => {
    expect(applyPick({ role: 'BOTTOM', championId: 51 }, { championId: null, position: 'TOP' })).toEqual({ role: 'TOP', championId: 51 })
    expect(applyPick({ role: 'BOTTOM', championId: 51 }, { championId: 238, position: null })).toEqual({ role: 'BOTTOM', championId: 238 })
  })
  it('returns the same selection when nothing changes', () => {
    const sel = { role: 'MIDDLE' as const, championId: 238 }
    expect(applyPick(sel, { championId: 238, position: 'MIDDLE' })).toBe(sel)
  })
})
