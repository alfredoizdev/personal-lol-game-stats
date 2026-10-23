import { describe, it, expect } from 'vitest'
import { pushRegistrationAction } from '../src/lib/push-registration'

describe('pushRegistrationAction', () => {
  it('registers only once the signed-in user has goal updates on', () => {
    expect(pushRegistrationAction(null, { signedIn: true, goalPush: true })).toBe('register')
    expect(pushRegistrationAction(false, { signedIn: true, goalPush: true })).toBe('register')
  })
  it('does nothing while signed out, while prefs are unknown, or while the toggle is off', () => {
    expect(pushRegistrationAction(null, { signedIn: false, goalPush: true })).toBeNull()
    expect(pushRegistrationAction(null, { signedIn: true, goalPush: null })).toBeNull()
    expect(pushRegistrationAction(null, { signedIn: true, goalPush: false })).toBeNull()
  })
  it('revokes this device when the toggle goes from on to off', () => {
    expect(pushRegistrationAction(true, { signedIn: true, goalPush: false })).toBe('revoke')
  })
  it('does not re-register while it stays on', () => {
    expect(pushRegistrationAction(true, { signedIn: true, goalPush: true })).toBeNull()
  })
})
