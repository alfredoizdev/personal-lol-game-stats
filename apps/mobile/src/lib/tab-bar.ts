export type TabName = 'matches' | 'live' | 'performance' | 'profile'

/** What the tab bar sees of the focused tab route: its name and, when the tab holds a stack, that stack's state. */
export type FocusedTabRoute = { name: string; state?: { index: number } }

/**
 * The bar shows on every tab root and hides on a screen pushed inside a tab
 * (Match Review, How it is scored): there the chevron is the way back (owner, 2026-10-23).
 */
export function tabBarHiddenFor(route: FocusedTabRoute): boolean {
  return (route.state?.index ?? 0) > 0
}

/** Which tab to highlight for a focused tab route; anything unknown maps to Matches. */
export function activeTabFor(routeName: string): TabName {
  if (routeName === 'live' || routeName === 'performance' || routeName === 'profile') return routeName
  return 'matches'
}
