import { describe, it, expect, vi } from 'vitest'
import type { LiveSnapshotV2 } from '@lpp/shared'
import { createLivePublisher } from '@electron/live/live-publisher'

function snapshot(ts: number, cs = 100): LiveSnapshotV2 {
  return {
    v: 2, ts, isFinal: false, gameTimeSeconds: 600, gameMode: 'CLASSIC', queueId: 420, teamKills: 3,
    me: { championName: 'Yasuo', position: 'MIDDLE', level: 9, kills: 2, deaths: 0, assists: 1, cs, csPerMin: 10, wardScore: 3, items: [], isDead: null, respawnSec: null },
    opponent: null, focus: null, events: [],
  }
}

function fakeClient(sendResult: string = 'ok') {
  const handlers = new Map<string, (msg: { payload?: unknown }) => void>()
  const channels: Array<{ name: string; opts: unknown; sent: unknown[]; subscribed: boolean; unsubscribed: boolean }> = []
  const client = {
    channel: vi.fn((name: string, opts?: unknown) => {
      const rec = { name, opts, sent: [] as unknown[], subscribed: false, unsubscribed: false }
      channels.push(rec)
      const ch = {
        on: vi.fn((_type: string, filter: { event: string }, handler: (msg: { payload?: unknown }) => void) => {
          handlers.set(filter.event, handler)
          return ch
        }),
        subscribe: (cb?: (status: string) => void) => {
          rec.subscribed = true
          cb?.('SUBSCRIBED')
          return ch
        },
        send: vi.fn(async (msg: unknown) => {
          rec.sent.push(msg)
          return sendResult
        }),
        unsubscribe: vi.fn(async () => {
          rec.unsubscribed = true
          return 'ok'
        }),
      }
      return ch
    }),
  }
  return { client, channels, handlers }
}

describe('createLivePublisher', () => {
  it('subscribes lazily to the private lanepulse:<id> channel and sends the first snapshot as a broadcast', async () => {
    const { client, channels } = fakeClient()
    const pub = createLivePublisher(client as never, 'u1')
    expect(channels.length).toBe(0)
    await pub.publish(snapshot(1000))
    expect(channels[0]?.name).toBe('lanepulse:u1')
    expect(channels[0]?.opts).toEqual({ config: { private: true } })
    expect(channels[0]?.subscribed).toBe(true)
    expect(channels[0]?.sent[0]).toMatchObject({ type: 'broadcast', event: 'live-snapshot', payload: { v: 2, ts: 1000 } })
  })

  it('skips an unchanged snapshot inside the heartbeat window and sends after it', async () => {
    const { client, channels } = fakeClient()
    const pub = createLivePublisher(client as never, 'u1')
    await pub.publish(snapshot(1000))
    await pub.publish(snapshot(4000))
    expect(channels[0]?.sent.length).toBe(1)
    await pub.publish(snapshot(11_000))
    expect(channels[0]?.sent.length).toBe(2)
    await pub.publish(snapshot(12_000, 101))
    expect(channels[0]?.sent.length).toBe(3)
  })

  it('recreates the channel after a failed send', async () => {
    const { client, channels } = fakeClient('error')
    const pub = createLivePublisher(client as never, 'u1')
    await pub.publish(snapshot(1000))
    await pub.publish(snapshot(2000, 101))
    expect(channels.length).toBe(2)
    expect(channels[0]?.unsubscribed).toBe(true)
  })

  it('publishPhase sends a live-phase broadcast on the same private channel', async () => {
    const { client, channels } = fakeClient()
    const pub = createLivePublisher(client as never, 'u1')
    await pub.publishPhase({ v: 1, ts: 5, phase: 'Matchmaking', since: 12_000 })
    await pub.publish(snapshot(1000))
    expect(channels.length).toBe(1)
    expect(channels[0]?.sent[0]).toEqual({ type: 'broadcast', event: 'live-phase', payload: { v: 1, ts: 5, phase: 'Matchmaking', since: 12_000 } })
    expect(channels[0]?.sent[1]).toMatchObject({ event: 'live-snapshot' })
  })

  it('a live-ping from the phone (fresh subscription) triggers onPing and resend() repeats the last snapshot', async () => {
    const { client, channels, handlers } = fakeClient()
    const onPing = vi.fn()
    const pub = createLivePublisher(client as never, 'u1', { onPing })
    await pub.publish(snapshot(1000))
    handlers.get('live-ping')!({ payload: { v: 1 } })
    expect(onPing).toHaveBeenCalledTimes(1)
    await pub.resend()
    expect(channels[0]?.sent.length).toBe(2)
    expect(channels[0]?.sent[1]).toMatchObject({ event: 'live-snapshot', payload: { ts: 1000 } })
  })

  it('stop() unsubscribes', async () => {
    const { client, channels } = fakeClient()
    const pub = createLivePublisher(client as never, 'u1')
    await pub.publish(snapshot(1000))
    await pub.stop()
    expect(channels[0]?.unsubscribed).toBe(true)
    await pub.publish(snapshot(20_000))
    expect(channels.length).toBe(2)
  })

  it('concurrent publishes during the handshake share one channel', async () => {
    let subscribed = 0
    const sent: unknown[] = []
    const client = {
      channel: vi.fn(() => {
        const ch = {
          subscribe: (cb?: (status: string) => void) => {
            subscribed++
            setTimeout(() => cb?.('SUBSCRIBED'), 5)
            return ch
          },
          send: vi.fn(async (msg: unknown) => {
            sent.push(msg)
            return 'ok'
          }),
          unsubscribe: vi.fn(async () => 'ok'),
        }
        return ch
      }),
    }
    const pub = createLivePublisher(client as never, 'u1')
    await Promise.all([pub.publish(snapshot(1000, 100)), pub.publish(snapshot(1500, 120))])
    expect(client.channel).toHaveBeenCalledTimes(1)
    expect(subscribed).toBe(1)
    expect(sent.length).toBe(2)
  })
})
