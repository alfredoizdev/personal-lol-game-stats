import { describe, it, expect } from 'vitest'
import { activeTabFor, tabBarHiddenFor } from '../src/lib/tab-bar'

describe('tab bar rules', () => {
  it('never hides the bar on a tab route', () => {
    expect(tabBarHiddenFor('matches')).toBe(false)
    expect(tabBarHiddenFor('live')).toBe(false)
  })
  it('highlights Matches while on a match review', () => {
    expect(activeTabFor('matches')).toBe('matches')
    expect(activeTabFor('live')).toBe('live')
    expect(activeTabFor('profile')).toBe('profile')
  })
})
