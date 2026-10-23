export type TabName = 'matches' | 'live' | 'performance' | 'profile'

/** What the tab bar sees: the focused tab route's name, the current URL segments, and (when present) the tab's nested stack state. */
export type FocusedTabRoute = { name: string; segments: readonly string[]; state?: { index: number } }

/**
 * The bar shows on every tab root and hides on a screen pushed inside a tab
 * (Match Review, How it is scored): there the chevron is the way back (owner, 2026-10-23).
 * Read from the URL segments (anything after the tab's own segment), with the
 * nested stack state as a second signal in case the segments lag a frame.
 */
export function tabBarHiddenFor(route: FocusedTabRoute): boolean {
  const at = route.segments.lastIndexOf(route.name)
  const pushed = at >= 0 && route.segments.length > at + 1
  return pushed || (route.state?.index ?? 0) > 0
}

/** Which tab to highlight for a focused tab route; anything unknown maps to Matches. */
export function activeTabFor(routeName: string): TabName {
  if (routeName === 'live' || routeName === 'performance' || routeName === 'profile') return routeName
  return 'matches'
}
