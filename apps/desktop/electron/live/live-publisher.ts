import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { liveTopic, shouldPublish, type LivePhasePayload, type LiveSnapshotV2 } from '@lpp/shared'

export type LivePublisher = {
  publish: (snapshot: LiveSnapshotV2) => Promise<void>
  /** Client phase (lobby, queue, ready check…) as a `live-phase` broadcast on the same channel. */
  publishPhase: (payload: LivePhasePayload) => Promise<void>
  /** Re-sends the last snapshot regardless of the change gate (a phone that just (re)subscribed asked for it). */
  resend: () => Promise<void>
  stop: () => Promise<void>
}

export type LivePublisherOptions = {
  /** A phone (re)subscribed and sent `live-ping`: answer with the current phase and snapshot. */
  onPing?: () => void
}

/**
 * Broadcasts live snapshots on the private `lanepulse:<id>` topic as
 * `live-snapshot` (Realtime Authorization, Phase 7). Subscribes
 * lazily, only sends when `shouldPublish` says so, and drops the channel
 * after a failed send so the next publish handshakes fresh.
 */
export function createLivePublisher(client: SupabaseClient, userId: string, opts: LivePublisherOptions = {}): LivePublisher {
  let channel: RealtimeChannel | null = null
  let pending: Promise<RealtimeChannel> | null = null // concurrent publishes share one handshake
  let prev: LiveSnapshotV2 | null = null

  const ensureChannel = (): Promise<RealtimeChannel> => {
    if (channel) return Promise.resolve(channel)
    if (pending) return pending
    pending = (async () => {
      const ch = client.channel(liveTopic(userId), { config: { private: true } })
      if (opts.onPing) ch.on('broadcast', { event: 'live-ping' }, () => opts.onPing?.())
      await new Promise<void>((resolve) => {
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') resolve()
        })
        // Never hang the poller on a slow handshake.
        setTimeout(resolve, 5000)
      })
      channel = ch
      pending = null
      return ch
    })()
    return pending
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
    async resend() {
      if (!prev) return
      const ch = await ensureChannel()
      const result = await ch.send({ type: 'broadcast', event: 'live-snapshot', payload: prev }).catch(() => 'error')
      if (result === 'error' || result === 'timed out') await dropChannel()
    },
    async publishPhase(payload) {
      const ch = await ensureChannel()
      const result = await ch.send({ type: 'broadcast', event: 'live-phase', payload }).catch(() => 'error')
      if (result === 'error' || result === 'timed out') await dropChannel()
    },
    async stop() {
      prev = null
      await dropChannel()
    },
  }
}
