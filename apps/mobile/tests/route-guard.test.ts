import { describe, it, expect } from 'vitest'
import { resolveEntryRoute, resolveAppGroupRedirect } from '../src/lib/route-guard'

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
  it('returns error when signed in and the linked-account query failed', () => {
    expect(resolveEntryRoute({ loading: false, signedIn: true, linked: null, linkError: true })).toBe('error')
  })
})

describe('resolveAppGroupRedirect', () => {
  it('waits while loading', () => {
    expect(resolveAppGroupRedirect({ loading: true, signedIn: false, linked: null, segment: 'matches' })).toBeNull()
  })
  it('redirects a signed-out user to sign-in', () => {
    expect(resolveAppGroupRedirect({ loading: false, signedIn: false, linked: null, segment: 'matches' })).toBe('/(auth)/sign-in')
  })
  it('redirects an unlinked user on a tab to the link screen', () => {
    expect(resolveAppGroupRedirect({ loading: false, signedIn: true, linked: false, segment: 'matches' })).toBe('/(app)/link')
    expect(resolveAppGroupRedirect({ loading: false, signedIn: true, linked: false, segment: 'live' })).toBe('/(app)/link')
  })
  it('does not redirect an unlinked user already on the link screen', () => {
    expect(resolveAppGroupRedirect({ loading: false, signedIn: true, linked: false, segment: 'link' })).toBeNull()
  })
  it('lets a linked user stay', () => {
    expect(resolveAppGroupRedirect({ loading: false, signedIn: true, linked: true, segment: 'matches' })).toBeNull()
  })
  it('does not redirect while the link status is unknown', () => {
    expect(resolveAppGroupRedirect({ loading: false, signedIn: true, linked: null, segment: 'matches' })).toBeNull()
  })
})
