/** The only screen a LanePulse push may open. */
export const LIVE_ROUTE = '/(app)/(tabs)/live'

/**
 * Where a tapped notification should take the user, or null to ignore it.
 * RiftLens shares the Supabase project and its users; its pushes carry a
 * different `app`, so they never open anything here.
 */
export function routeForNotification(data: unknown): typeof LIVE_ROUTE | null {
  if (!data || typeof data !== 'object') return null
  const d = data as { app?: unknown; route?: unknown }
  if (d.app !== 'lanepulse') return null
  return d.route === LIVE_ROUTE ? LIVE_ROUTE : null
}
