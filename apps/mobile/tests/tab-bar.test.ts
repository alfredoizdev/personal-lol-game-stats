import { describe, it, expect } from 'vitest'
import { activeTabFor, tabBarHiddenFor } from '../src/lib/tab-bar'

describe('tab bar rules', () => {
  it('shows the bar on every tab root (the URL ends at the tab)', () => {
    expect(tabBarHiddenFor({ name: 'matches', segments: ['(app)', '(tabs)', 'matches'] })).toBe(false)
    expect(tabBarHiddenFor({ name: 'live', segments: ['(app)', '(tabs)', 'live'] })).toBe(false)
    expect(tabBarHiddenFor({ name: 'matches', segments: ['(app)', '(tabs)', 'matches'], state: { index: 0 } })).toBe(false)
  })
  it('hides the bar on a screen pushed inside a tab, read from the URL segments (Match Review, How it is scored)', () => {
    expect(tabBarHiddenFor({ name: 'matches', segments: ['(app)', '(tabs)', 'matches', '[matchId]'] })).toBe(true)
    expect(tabBarHiddenFor({ name: 'matches', segments: ['(app)', '(tabs)', 'matches', 'how-scored'] })).toBe(true)
  })
  it('also hides it when the nested stack state says so, in case the segments lag', () => {
    expect(tabBarHiddenFor({ name: 'matches', segments: ['(app)', '(tabs)', 'matches'], state: { index: 1 } })).toBe(true)
  })
  it('highlights the tab a nested screen belongs to', () => {
    expect(activeTabFor('matches')).toBe('matches')
    expect(activeTabFor('live')).toBe('live')
    expect(activeTabFor('performance')).toBe('performance')
    expect(activeTabFor('profile')).toBe('profile')
  })
})
