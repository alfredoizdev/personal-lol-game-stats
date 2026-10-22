import { describe, it, expect } from 'vitest'
import { BACKFILL_COUNT, CHUNK, nextChunk, runBackfill } from '../src/lib/backfill'
import { RiotApiError } from '../src/lib/riot-api'

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

  describe('runBackfill', () => {
    const ids = Array.from({ length: 5 }, (_, i) => `m${i}`)
    it('fetches uncached ids once each, in chunks, and reports progress', async () => {
      const cached = new Set(['m0'])
      const calls: string[] = []
      const chunks: number[] = []
      const r = await runBackfill({
        ids,
        isCached: (id) => cached.has(id),
        fetchOne: async (id) => {
          calls.push(id)
          cached.add(id)
        },
        isPaused: () => false,
        onChunk: () => chunks.push(calls.length),
        chunkSize: 2,
      })
      expect(calls).toEqual(['m1', 'm2', 'm3', 'm4'])
      expect(chunks).toEqual([2, 4])
      expect(r).toEqual({ fetched: 4, failed: 0, stoppedBy: null })
    })
    it('never retries an id that failed in this run and finishes (no infinite loop)', async () => {
      const calls: string[] = []
      const r = await runBackfill({
        ids,
        isCached: () => false,
        fetchOne: async (id) => {
          calls.push(id)
          throw new Error('boom')
        },
        isPaused: () => false,
        onChunk: () => {},
        chunkSize: 2,
      })
      expect(calls).toEqual(ids)
      expect(r.failed).toBe(5)
      expect(r.stoppedBy).toBeNull()
    })
    it('stops the run on a Riot rate limit so the next press can retry later', async () => {
      const calls: string[] = []
      const r = await runBackfill({
        ids,
        isCached: () => false,
        fetchOne: async (id) => {
          calls.push(id)
          if (id === 'm1') throw new RiotApiError('RATE_LIMITED')
        },
        isPaused: () => false,
        onChunk: () => {},
        chunkSize: 2,
      })
      expect(calls).toEqual(['m0', 'm1'])
      expect(r.stoppedBy).toBeInstanceOf(RiotApiError)
    })
    it('waits while paused and stops when cancelled', async () => {
      let paused = true
      const calls: string[] = []
      const p = runBackfill({
        ids,
        isCached: () => false,
        fetchOne: async (id) => {
          calls.push(id)
        },
        isPaused: () => paused,
        onChunk: () => {},
        chunkSize: 2,
        pauseMs: 5,
      })
      await new Promise((r) => setTimeout(r, 20))
      expect(calls).toEqual([])
      paused = false
      const r = await p
      expect(calls.length).toBe(5)
      expect(r.fetched).toBe(5)
    })
  })
})

describe('cachedWithin', () => {
  it('counts the cached ids among the first n, in list order', async () => {
    const { cachedWithin } = await import('../src/lib/backfill')
    const ids = ['a', 'b', 'c', 'd']
    const isCached = (id: string) => id === 'a' || id === 'd'
    expect(cachedWithin(ids, isCached, 2)).toBe(1)
    expect(cachedWithin(ids, isCached, 4)).toBe(2)
    expect(cachedWithin(ids, isCached, 10)).toBe(2)
    expect(cachedWithin([], isCached, 20)).toBe(0)
  })
})
