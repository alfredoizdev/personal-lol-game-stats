import { describe, it, expect } from 'vitest'
import type { LiveAlert } from '@lpp/shared'
import { ALERT_TTL_MS, MAX_VISIBLE, dismissAlert, expireAlerts, pushAlerts, type QueuedAlert } from '../src/lib/live-alerts-queue'

const a = (id: string): LiveAlert => ({ id, kind: 'kill', title: id, body: null, tone: 'good' })

describe('live alerts queue', () => {
  it('appends new alerts with their arrival time and ignores an id already queued', () => {
    const q = pushAlerts([], [a('x'), a('y')], 1000)
    expect(q.map((q) => q.alert.id)).toEqual(['x', 'y'])
    expect(q[0]?.at).toBe(1000)
    expect(pushAlerts(q, [a('y'), a('z')], 2000).map((q) => q.alert.id)).toEqual(['x', 'y', 'z'])
  })
  it('keeps only the newest MAX_VISIBLE', () => {
    const q = pushAlerts([], [a('1'), a('2'), a('3'), a('4')], 0)
    expect(MAX_VISIBLE).toBe(3)
    expect(q.map((q) => q.alert.id)).toEqual(['2', '3', '4'])
  })
  it('expires alerts after ALERT_TTL_MS and lets a tap dismiss one early', () => {
    const q: QueuedAlert[] = pushAlerts([], [a('old')], 0).concat(pushAlerts([], [a('new')], 4000))
    expect(ALERT_TTL_MS).toBe(5000)
    expect(expireAlerts(q, 5001).map((q) => q.alert.id)).toEqual(['new'])
    expect(dismissAlert(q, 'new').map((q) => q.alert.id)).toEqual(['old'])
  })
})
