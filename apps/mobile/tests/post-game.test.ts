import { describe, expect, it } from 'vitest'
import { postGameNavigation, type PostGameObservation } from '@/lib/post-game-nav'
import { isReviewOf, postGameRedirect, reviewWaitState, REVIEW_GIVE_UP_MS, REVIEW_REDIRECT_DWELL_MS } from '@/lib/post-game-review'

const o = (p: Partial<PostGameObservation>): PostGameObservation => ({ view: 'waiting', phase: null, endedAt: null, ...p })

describe('postGameNavigation (the post-game screen opens and closes by itself)', () => {
  it('opens when a game just ended (new endedAt), never on the first observation', () => {
    expect(postGameNavigation({ prev: o({ view: 'live' }), next: o({ view: 'ended', endedAt: 100 }), onScreen: false, dismissedEndedAt: null })).toBe('open')
    expect(postGameNavigation({ prev: null, next: o({ view: 'ended', endedAt: 100 }), onScreen: false, dismissedEndedAt: null })).toBe('none')
  })
  it('does not reopen a game the player dismissed, but opens the next one', () => {
    expect(postGameNavigation({ prev: o({ view: 'ended', endedAt: 100 }), next: o({ view: 'ended', endedAt: 100 }), onScreen: false, dismissedEndedAt: 100 })).toBe('none')
    expect(postGameNavigation({ prev: o({ view: 'live', endedAt: 100 }), next: o({ view: 'ended', endedAt: 200 }), onScreen: false, dismissedEndedAt: 100 })).toBe('open')
  })
  it('closes when the next queue starts or a new game goes live while the screen shows', () => {
    expect(postGameNavigation({ prev: o({ view: 'ended', endedAt: 100 }), next: o({ view: 'ended', endedAt: 100, phase: 'Matchmaking' }), onScreen: true, dismissedEndedAt: null })).toBe('close')
    expect(postGameNavigation({ prev: o({ view: 'ended', endedAt: 100 }), next: o({ view: 'live', endedAt: 100 }), onScreen: true, dismissedEndedAt: null })).toBe('close')
    expect(postGameNavigation({ prev: o({ view: 'ended', endedAt: 100 }), next: o({ view: 'ended', endedAt: 100, phase: 'Lobby' }), onScreen: true, dismissedEndedAt: null })).toBe('none')
  })
})

describe('post-game review lookup (the match shows up in Riot history a minute or two later)', () => {
  it('isReviewOf: the match started within the game length (plus slack) before the game ended', () => {
    const endedAt = Date.UTC(2026, 9, 23, 12, 30)
    const started = (minBefore: number) => new Date(endedAt - minBefore * 60_000).toISOString()
    expect(isReviewOf({ startedAt: started(25) }, endedAt, 24 * 60)).toBe(true)
    expect(isReviewOf({ startedAt: started(60) }, endedAt, 24 * 60)).toBe(false) // an earlier game
    expect(isReviewOf({ startedAt: new Date(endedAt + 60_000).toISOString() }, endedAt, 24 * 60)).toBe(false) // a later game
  })
  it('reviewWaitState: looking → found → gave up after the limit', () => {
    expect(REVIEW_GIVE_UP_MS).toBe(6 * 60_000)
    expect(reviewWaitState({ found: false, endedAt: 0, nowMs: 30_000 })).toBe('looking')
    expect(reviewWaitState({ found: true, endedAt: 0, nowMs: 30_000 })).toBe('found')
    expect(reviewWaitState({ found: false, endedAt: 0, nowMs: REVIEW_GIVE_UP_MS + 1 })).toBe('gave-up')
  })
})

describe('postGameRedirect (owner, 2026-10-27: once the review is ready, the post-game screen goes to it by itself)', () => {
  it('redirects once the review has been found for a short dwell, so the summary does not flash away', () => {
    expect(REVIEW_REDIRECT_DWELL_MS).toBe(3000)
    expect(postGameRedirect({ foundAtMs: null, nowMs: 10_000 })).toBe(false)
    expect(postGameRedirect({ foundAtMs: 10_000, nowMs: 11_000 })).toBe(false)
    expect(postGameRedirect({ foundAtMs: 10_000, nowMs: 13_000 })).toBe(true)
  })
})
