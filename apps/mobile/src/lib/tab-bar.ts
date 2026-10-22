export type TabName = 'matches' | 'live' | 'profile'

/** Routes inside the (app) group that must not show the tab bar. */
const HIDDEN: readonly string[] = ['link']

export function tabBarHiddenFor(routeName: string): boolean {
  return HIDDEN.includes(routeName)
}

/** Which tab to highlight for a focused route; nested routes map to their tab. */
export function activeTabFor(routeName: string): TabName {
  if (routeName === 'live' || routeName === 'profile') return routeName
  return 'matches'
}
