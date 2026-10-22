import { describe, it, expect } from 'vitest'
import { liveTopic } from '../src/live-topic'

describe('liveTopic', () => {
  it('names the private LanePulse channel after the user id', () => {
    expect(liveTopic('5d2c0b4e-1111-2222-3333-444444444444')).toBe('lanepulse:5d2c0b4e-1111-2222-3333-444444444444')
  })
  it('never collides with the public RiftLens user:<id> channel', () => {
    expect(liveTopic('abc')).not.toMatch(/^user:/)
  })
  it('throws on an empty or blank id', () => {
    expect(() => liveTopic('')).toThrow()
    expect(() => liveTopic('   ')).toThrow()
  })
})
