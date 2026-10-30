import { describe, expect, it } from 'vitest'
import { isReviewed, markReviewed } from '../src/lib/reviewed-game'

describe('reviewed game (owner, 2026-10-30: back from the review, Live showed "Go to Matches" again)', () => {
  it('remembers the game whose review was opened, by its end time', () => {
    expect(isReviewed(1_000)).toBe(false)
    markReviewed(1_000)
    expect(isReviewed(1_000)).toBe(true)
    expect(isReviewed(2_000)).toBe(false)
    expect(isReviewed(null)).toBe(false)
  })
})
