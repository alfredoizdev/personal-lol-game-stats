import { describe, it, expect } from 'vitest'
import { claimRun, getRun, isRunOwned, releaseRun, setRun, subscribeRuns } from '../src/lib/backfill-run'

describe('backfill run store (shared by every useOwnHistory instance)', () => {
  it('is idle per account and notifies subscribers on change', () => {
    expect(getRun('a')).toEqual({ running: false, error: null, limit: null })
    let calls = 0
    const off = subscribeRuns(() => { calls += 1 })
    setRun('a', { running: true })
    expect(getRun('a')).toEqual({ running: true, error: null, limit: null })
    expect(getRun('b').running).toBe(false)
    expect(calls).toBe(1)
    off()
    setRun('a', { running: false, error: new Error('x') })
    expect(calls).toBe(1)
    expect(getRun('a').running).toBe(false)
  })
  it('returns the same snapshot object until something changes', () => {
    const s1 = getRun('c')
    expect(getRun('c')).toBe(s1)
    setRun('c', { running: true })
    expect(getRun('c')).not.toBe(s1)
  })
  it('only one instance can own a run for an account', () => {
    expect(isRunOwned('d')).toBe(false)
    expect(claimRun('d')).toBe(true)
    expect(isRunOwned('d')).toBe(true)
    expect(claimRun('d')).toBe(false)
    releaseRun('d')
    expect(isRunOwned('d')).toBe(false)
    expect(claimRun('d')).toBe(true)
    releaseRun('d')
  })
})

describe('run limit', () => {
  it('a run can be limited to the first n ids; the next run resets the limit', () => {
    setRun('e', { running: true, limit: 40 })
    expect(getRun('e').limit).toBe(40)
    setRun('e', { running: false })
    setRun('e', { running: true, limit: null })
    expect(getRun('e').limit).toBeNull()
  })
})
