/**
 * Name of the private Realtime broadcast topic that carries live snapshots
 * from the desktop companion to the phone. Guarded by the `realtime.messages`
 * policies in migration 20261023000003: only the user whose id is in the
 * name can send or receive. Deliberately not `user:<id>`, which RiftLens
 * keeps as a public channel in the same project.
 */
export function liveTopic(userId: string): string {
  if (!userId || !userId.trim()) throw new Error('liveTopic: user id required')
  return `lanepulse:${userId}`
}
