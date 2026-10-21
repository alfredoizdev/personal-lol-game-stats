import { describe, it, expect } from 'vitest'
import { resolveEntryRoute } from '../src/lib/route-guard'

describe('resolveEntryRoute', () => {
  it('returns null while auth is loading', () => {
    expect(resolveEntryRoute({ loading: true, signedIn: false, linked: null })).toBeNull()
  })
  it('sends a signed-out user to sign-in', () => {
    expect(resolveEntryRoute({ loading: false, signedIn: false, linked: null })).toBe('/(auth)/sign-in')
  })
  it('returns null while signed in and the link status is unknown', () => {
    expect(resolveEntryRoute({ loading: false, signedIn: true, linked: null })).toBeNull()
  })
  it('sends a signed-in user without a Riot ID to the link screen', () => {
    expect(resolveEntryRoute({ loading: false, signedIn: true, linked: false })).toBe('/(app)/link')
  })
  it('sends a linked user to matches', () => {
    expect(resolveEntryRoute({ loading: false, signedIn: true, linked: true })).toBe('/(app)/matches')
  })
})
