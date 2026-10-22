import { describe, it, expect } from 'vitest'
import { INITIAL_PAGE, PAGE_STEP, nextPage } from '../src/lib/paging'

describe('nextPage', () => {
  it('starts at 10 and grows by 5, never past the total', () => {
    expect(INITIAL_PAGE).toBe(10)
    expect(PAGE_STEP).toBe(5)
    expect(nextPage(10, 20)).toBe(15)
    expect(nextPage(15, 20)).toBe(20)
    expect(nextPage(20, 20)).toBe(20)
    expect(nextPage(10, 7)).toBe(7)
  })
})
