import { describe, expect, it } from 'vitest'
import { showEventsFeed } from '@/lib/live-sections'

describe('showEventsFeed', () => {
  it('shows the game events while the game is on, even when the desktop is briefly stale', () => {
    expect(showEventsFeed('live')).toBe(true)
    expect(showEventsFeed('stale')).toBe(true)
  })

  it('hides the game events once the match has ended: they are not stats', () => {
    expect(showEventsFeed('ended')).toBe(false)
  })
})
