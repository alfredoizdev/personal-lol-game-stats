import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { shouldPublish, type LiveSnapshotV2 } from '@lpp/shared'

export type LivePublisher = {
  publish: (snapshot: LiveSnapshotV2) => Promise<void>
  stop: () => Promise<void>
}

/**
 * Broadcasts live snapshots on `user:<id>` as `live-snapshot`. Subscribes
 * lazily, only sends when `shouldPublish` says so, and drops the channel
 * after a failed send so the next publish handshakes fresh.
 */
export function createLivePublisher(client: SupabaseClient, userId: string): LivePublisher {
  let channel: RealtimeChannel | null = null
  let prev: LiveSnapshotV2 | null = null

  const ensureChannel = async (): Promise<RealtimeChannel> => {
    if (channel) return channel
    const ch = client.channel(`user:${userId}`)
    await new Promise<void>((resolve) => {
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') resolve()
      })
      // Never hang the poller on a slow handshake.
      setTimeout(resolve, 5000)
    })
    channel = ch
    return ch
  }

  const dropChannel = async () => {
    const ch = channel
    channel = null
    if (ch) await ch.unsubscribe().catch(() => {})
  }

  return {
    async publish(snapshot) {
      if (!shouldPublish(prev, snapshot)) return
      const ch = await ensureChannel()
      const result = await ch.send({ type: 'broadcast', event: 'live-snapshot', payload: snapshot }).catch(() => 'error')
      if (result === 'error' || result === 'timed out') {
        await dropChannel()
        return
      }
      prev = snapshot
    },
    async stop() {
      prev = null
      await dropChannel()
    },
  }
}
