export type EntryRoute = '/(auth)/sign-in' | '/(app)/link' | '/(app)/(tabs)/matches'

export type EntryInput = {
  loading: boolean
  signedIn: boolean
  /** null while unknown (query not resolved yet). */
  linked: boolean | null
  /** true when the linked-account query failed (offline, RLS, 5xx). */
  linkError?: boolean
}

/**
 * Where the app's index should redirect. `null` means "not decidable yet,
 * keep waiting"; `'error'` means the linked-account query failed and the
 * index should show a retry state instead of a spinner.
 */
export function resolveEntryRoute(input: EntryInput): EntryRoute | 'error' | null {
  if (input.loading) return null
  if (!input.signedIn) return '/(auth)/sign-in'
  if (input.linkError) return 'error'
  if (input.linked === null) return null
  return input.linked ? '/(app)/(tabs)/matches' : '/(app)/link'
}

export type AppGroupInput = {
  loading: boolean
  signedIn: boolean
  linked: boolean | null
  /** First segment inside the (app) group: '(tabs)' | 'link'. */
  segment: string | undefined
}

/** Guard for the (app) group: signed-out users go to sign-in, unlinked users go to the link screen. */
export function resolveAppGroupRedirect(input: AppGroupInput): '/(auth)/sign-in' | '/(app)/link' | null {
  if (input.loading) return null
  if (!input.signedIn) return '/(auth)/sign-in'
  if (input.linked === false && input.segment !== 'link') return '/(app)/link'
  return null
}
