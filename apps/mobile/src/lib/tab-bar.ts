export type TabName = 'matches' | 'live' | 'profile'

/** Tab routes that must not show the tab bar (none today: `link` lives outside the tabs). */
const HIDDEN: readonly string[] = []

export function tabBarHiddenFor(routeName: string): boolean {
  return HIDDEN.includes(routeName)
}

/** Which tab to highlight for a focused tab route; anything unknown maps to Matches. */
export function activeTabFor(routeName: string): TabName {
  if (routeName === 'live' || routeName === 'profile') return routeName
  return 'matches'
}
