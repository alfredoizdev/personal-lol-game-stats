import { describe, it, expect } from 'vitest'
import { routeForNotification } from '../src/lib/push-routing'

describe('routeForNotification', () => {
  it('opens the Live tab for a LanePulse goal notification', () => {
    expect(routeForNotification({ app: 'lanepulse', route: '/(app)/(tabs)/live' })).toBe('/(app)/(tabs)/live')
  })
  it('ignores notifications from other apps sharing the account (RiftLens coaching)', () => {
    expect(routeForNotification({ app: 'riftlens', route: '/(app)/(tabs)/live' })).toBeNull()
    expect(routeForNotification({ route: '/(app)/(tabs)/live' })).toBeNull()
  })
  it('ignores malformed or foreign routes', () => {
    expect(routeForNotification(null)).toBeNull()
    expect(routeForNotification('x')).toBeNull()
    expect(routeForNotification({ app: 'lanepulse' })).toBeNull()
    expect(routeForNotification({ app: 'lanepulse', route: 'https://evil.example' })).toBeNull()
    expect(routeForNotification({ app: 'lanepulse', route: '/(app)/(tabs)/profile' })).toBeNull()
  })
})
