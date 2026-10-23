import { describe, it, expect } from 'vitest'
import { activeTabFor, tabBarHiddenFor } from '../src/lib/tab-bar'

describe('tab bar rules', () => {
  it('shows the bar on every tab root', () => {
    expect(tabBarHiddenFor({ name: 'matches', state: undefined })).toBe(false)
    expect(tabBarHiddenFor({ name: 'matches', state: { index: 0 } })).toBe(false)
    expect(tabBarHiddenFor({ name: 'live', state: undefined })).toBe(false)
    expect(tabBarHiddenFor({ name: 'performance', state: undefined })).toBe(false)
  })
  it('hides the bar on a screen pushed inside a tab (Match Review, How it is scored): the chevron is the way back (owner, 2026-10-23)', () => {
    expect(tabBarHiddenFor({ name: 'matches', state: { index: 1 } })).toBe(true)
    expect(tabBarHiddenFor({ name: 'matches', state: { index: 2 } })).toBe(true)
  })
  it('highlights the tab a nested screen belongs to', () => {
    expect(activeTabFor('matches')).toBe('matches')
    expect(activeTabFor('live')).toBe('live')
    expect(activeTabFor('performance')).toBe('performance')
    expect(activeTabFor('profile')).toBe('profile')
  })
})
