import { describe, it, expect } from 'vitest'
import { formatDuration, formatKda, relativeTime, relativeTimeShort } from '../src/format'
import { queueLabel } from '../src/queue-label'

describe('formatDuration', () => {
  it('mm:ss', () => {
    expect(formatDuration(1694)).toBe('28:14')
    expect(formatDuration(3605)).toBe('60:05')
    expect(formatDuration(59)).toBe('0:59')
  })
})

describe('formatKda', () => {
  it('ratio to one decimal', () => {
    expect(formatKda(12, 4, 8)).toBe('5.0 KDA')
    expect(formatKda(3, 7, 4)).toBe('1.0 KDA')
  })
  it('perfect when no deaths', () => {
    expect(formatKda(3, 0, 2)).toBe('Perfect')
  })
})

describe('relativeTime', () => {
  const now = Date.UTC(2026, 9, 21, 12, 0, 0)
  const at = (ms: number) => new Date(now - ms).toISOString()
  it('buckets', () => {
    expect(relativeTime(at(30_000), now)).toBe('just now')
    expect(relativeTime(at(5 * 60_000), now)).toBe('5 min ago')
    expect(relativeTime(at(2 * 3_600_000), now)).toBe('2 hours ago')
    expect(relativeTime(at(1 * 3_600_000), now)).toBe('1 hour ago')
    expect(relativeTime(at(26 * 3_600_000), now)).toBe('1 day ago')
    expect(relativeTime(at(3 * 86_400_000), now)).toBe('3 days ago')
    expect(relativeTime(at(10 * 86_400_000), now)).toBe('Oct 11')
  })
})

describe('queueLabel', () => {
  it('known and unknown ids', () => {
    expect(queueLabel(420)).toBe('Ranked Solo')
    expect(queueLabel(450)).toBe('ARAM')
    expect(queueLabel(9999)).toBe('Other')
  })
})

describe('relativeTimeShort', () => {
  const now = Date.parse('2026-10-22T12:00:00Z')
  it('stays on one short token', () => {
    expect(relativeTimeShort('2026-10-22T11:59:40Z', now)).toBe('now')
    expect(relativeTimeShort('2026-10-22T11:48:00Z', now)).toBe('12m ago')
    expect(relativeTimeShort('2026-10-22T02:00:00Z', now)).toBe('10h ago')
    expect(relativeTimeShort('2026-10-19T12:00:00Z', now)).toBe('3d ago')
    expect(relativeTimeShort('2026-10-01T12:00:00Z', now)).toBe('Oct 1')
  })
})
