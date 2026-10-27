import { describe, it, expect } from 'vitest'
import { backfillLine, goalSaveState } from '../src/lib/prematch-ui'

describe('backfillLine (Prepare loads its window by itself; no button)', () => {
  it('says it is finding games while the id list is pending', () => {
    expect(backfillLine({ idsPending: true, total: 0, loaded: 0, running: false, error: null })).toEqual({ text: 'Finding your recent games…', retry: false })
  })
  it('shows progress while loading', () => {
    expect(backfillLine({ idsPending: false, total: 100, loaded: 42, running: true, error: null })).toEqual({ text: 'Loading your last 100 games… 42 of 100', retry: false })
  })
  it('shows nothing once every game in the window is loaded', () => {
    expect(backfillLine({ idsPending: false, total: 100, loaded: 100, running: false, error: null })).toBeNull()
    expect(backfillLine({ idsPending: false, total: 37, loaded: 37, running: false, error: null })).toBeNull()
  })
  it('offers a retry when a run stopped short', () => {
    expect(backfillLine({ idsPending: false, total: 100, loaded: 60, running: false, error: new Error('x') })).toEqual({ text: '60 of 100 games loaded', retry: true })
  })
  it('reports no games plainly', () => {
    expect(backfillLine({ idsPending: false, total: 0, loaded: 0, running: false, error: null })).toEqual({ text: 'No recent games found', retry: false })
  })
})

describe('goalSaveState (visible confirmation after Save goal)', () => {
  const saved = { metric: 'csPerMin' as const, target: 7 }
  it('is null before anything was saved in this session', () => {
    expect(goalSaveState(null, { metric: 'csPerMin', target: 7 })).toBeNull()
  })
  it('confirms with the saved goal while the editor still shows it', () => {
    expect(goalSaveState(saved, { metric: 'csPerMin', target: 7 })).toEqual({ kind: 'saved', line: 'Goal saved · 7.0 CS/min · shows on Live and in your match review' })
  })
  it('turns into a reminder once the editor moves away from the saved value', () => {
    expect(goalSaveState(saved, { metric: 'csPerMin', target: 7.5 })).toEqual({ kind: 'dirty', line: 'Saved goal: 7.0 CS/min · save again to replace it' })
    expect(goalSaveState(saved, { metric: 'kpPct', target: 7 })?.kind).toBe('dirty')
  })
})

describe('goalSaveState with a standing goal (one editor for every game)', () => {
  it('confirms a recommended-for-your-role goal in words, no bare number', () => {
    expect(goalSaveState({ metric: 'csPerMin', target: null }, { metric: 'csPerMin', target: null })).toEqual({ kind: 'saved', line: 'Goal saved · recommended for the role you play · shows on Live and in your match review' })
  })
  it('a fixed number stays a fixed number; moving off it is dirty', () => {
    expect(goalSaveState({ metric: 'deathsPer10', target: 2 }, { metric: 'deathsPer10', target: 2 })?.kind).toBe('saved')
    expect(goalSaveState({ metric: 'csPerMin', target: null }, { metric: 'csPerMin', target: 7.5 })).toEqual({ kind: 'dirty', line: 'Saved goal: recommended for the role you play · save again to replace it' })
  })
})
