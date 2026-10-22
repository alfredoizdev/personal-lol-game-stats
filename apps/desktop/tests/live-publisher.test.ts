import { describe, it, expect, vi } from 'vitest'
import type { LiveSnapshotV2 } from '@lpp/shared'
import { createLivePublisher } from '@electron/live/live-publisher'

function snapshot(ts: number, cs = 100): LiveSnapshotV2 {
  return {
    v: 2, ts, isFinal: false, gameTimeSeconds: 600, gameMode: 'CLASSIC', queueId: 420, teamKills: 3,
    me: { championName: 'Yasuo', position: 'MIDDLE', level: 9, kills: 2, deaths: 0, assists: 1, cs, csPerMin: 10, wardScore: 3, items: [] },
    opponent: null, focus: null,
  }
}

function fakeClient(sendResult: string = 'ok') {
  const channels: Array<{ name: string; sent: unknown[]; subscribed: boolean; unsubscribed: boolean }> = []
  const client = {
    channel: vi.fn((name: string) => {
      const rec = { name, sent: [] as unknown[], subscribed: false, unsubscribed: false }
      channels.push(rec)
      const ch = {
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
  return { client, channels }
}

describe('createLivePublisher', () => {
  it('subscribes lazily to user:<id> and sends the first snapshot as a broadcast', async () => {
    const { client, channels } = fakeClient()
    const pub = createLivePublisher(client as never, 'u1')
    expect(channels.length).toBe(0)
    await pub.publish(snapshot(1000))
    expect(channels[0]?.name).toBe('user:u1')
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

  it('stop() unsubscribes', async () => {
    const { client, channels } = fakeClient()
    const pub = createLivePublisher(client as never, 'u1')
    await pub.publish(snapshot(1000))
    await pub.stop()
    expect(channels[0]?.unsubscribed).toBe(true)
    await pub.publish(snapshot(20_000))
    expect(channels.length).toBe(2)
  })
})
