import { describe, it, expect } from 'vitest'
import { activeTabFor, tabBarHiddenFor } from '../src/lib/tab-bar'

describe('tab bar rules', () => {
  it('hides the bar on the link screen only', () => {
    expect(tabBarHiddenFor('link')).toBe(true)
    expect(tabBarHiddenFor('matches')).toBe(false)
    expect(tabBarHiddenFor('match/[matchId]')).toBe(false)
  })
  it('highlights Matches while on a match review', () => {
    expect(activeTabFor('match/[matchId]')).toBe('matches')
    expect(activeTabFor('live')).toBe('live')
    expect(activeTabFor('profile')).toBe('profile')
  })
})
