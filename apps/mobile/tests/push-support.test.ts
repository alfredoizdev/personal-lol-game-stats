import { describe, it, expect } from 'vitest'
import { isPushSupported } from '../src/lib/push-support'

describe('isPushSupported', () => {
  it('is false in Expo Go (storeClient) and on simulators', () => {
    expect(isPushSupported({ executionEnvironment: 'storeClient', isDevice: true })).toBe(false)
    expect(isPushSupported({ executionEnvironment: 'standalone', isDevice: false })).toBe(false)
  })
  it('is true in a dev client or standalone build on a real device', () => {
    expect(isPushSupported({ executionEnvironment: 'standalone', isDevice: true })).toBe(true)
    expect(isPushSupported({ executionEnvironment: 'bare', isDevice: true })).toBe(true)
  })
  it('treats an unknown environment as unsupported', () => {
    expect(isPushSupported({ executionEnvironment: undefined, isDevice: true })).toBe(false)
  })
})
