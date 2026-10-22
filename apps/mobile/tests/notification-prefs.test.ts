import { describe, it, expect } from 'vitest'
import { DEFAULT_PREFS, prefsFromRow, prefsToRow, type NotificationPrefs } from '../src/lib/notification-prefs'

describe('notification prefs mapping', () => {
  it('defaults to off, change mode', () => {
    expect(DEFAULT_PREFS).toEqual({ goalPush: false, mode: 'change' })
    expect(prefsFromRow(null)).toEqual(DEFAULT_PREFS)
  })
  it('reads a row and tolerates unknown values', () => {
    expect(prefsFromRow({ goal_push: true, goal_push_mode: 'interval' })).toEqual({ goalPush: true, mode: 'interval' })
    expect(prefsFromRow({ goal_push: 'yes', goal_push_mode: 'hourly' })).toEqual({ goalPush: false, mode: 'change' })
  })
  it('writes the row the table expects', () => {
    const p: NotificationPrefs = { goalPush: true, mode: 'interval' }
    expect(prefsToRow('u1', p)).toEqual({ user_id: 'u1', goal_push: true, goal_push_mode: 'interval' })
  })
})
