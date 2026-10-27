import { describe, it, expect } from 'vitest'
import { inQueueFilter, QUEUE_FILTERS, queueGroup, queueTag } from '../src/queue-filter'
import { queueLabel } from '../src/queue-label'

describe('queueGroup (owner, 2026-10-27: ranked apart from normals)', () => {
  it('ranked = Solo/Duo and Flex; normal = Draft, Blind, Quickplay, Swiftplay; everything else is other', () => {
    expect(queueGroup(420)).toBe('ranked')
    expect(queueGroup(440)).toBe('ranked')
    expect(queueGroup(400)).toBe('normal')
    expect(queueGroup(430)).toBe('normal')
    expect(queueGroup(480)).toBe('normal')
    expect(queueGroup(490)).toBe('normal')
    expect(queueGroup(450)).toBe('other') // ARAM
    expect(queueGroup(700)).toBe('other') // Clash
    expect(queueGroup(0)).toBe('other')
  })
  it('inQueueFilter: all keeps everything; ranked and normal keep their group only', () => {
    expect(QUEUE_FILTERS).toEqual(['all', 'ranked', 'normal'])
    expect(inQueueFilter(450, 'all')).toBe(true)
    expect(inQueueFilter(420, 'ranked')).toBe(true)
    expect(inQueueFilter(400, 'ranked')).toBe(false)
    expect(inQueueFilter(400, 'normal')).toBe(true)
    expect(inQueueFilter(450, 'normal')).toBe(false)
  })
  it('queueTag is the short word on a match row; Swiftplay has a label now', () => {
    expect(queueTag(420)).toBe('Ranked')
    expect(queueTag(440)).toBe('Flex')
    expect(queueTag(400)).toBe('Normal')
    expect(queueTag(430)).toBe('Normal')
    expect(queueTag(480)).toBe('Swiftplay')
    expect(queueTag(490)).toBe('Quickplay')
    expect(queueTag(450)).toBe('ARAM')
    expect(queueTag(1700)).toBe('Arena')
    expect(queueLabel(480)).toBe('Swiftplay')
  })
})
