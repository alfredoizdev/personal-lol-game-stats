import { describe, it, expect } from 'vitest'
import { BACKFILL_COUNT, CHUNK, nextChunk } from '../src/lib/backfill'

describe('backfill', () => {
  it('takes the first uncached ids in list order, up to the chunk size', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `m${i}`)
    const cached = new Set(['m0', 'm1', 'm5'])
    const chunk = nextChunk(ids, cached, 4)
    expect(chunk).toEqual(['m2', 'm3', 'm4', 'm6'])
  })
  it('is empty when everything is cached, and never repeats a cached id after an interruption', () => {
    const ids = ['a', 'b', 'c']
    expect(nextChunk(ids, new Set(ids))).toEqual([])
    expect(nextChunk(ids, new Set(['a']))).toEqual(['b', 'c'])
  })
  it('exposes the spec constants', () => {
    expect(BACKFILL_COUNT).toBe(100)
    expect(CHUNK).toBe(20)
  })
})
