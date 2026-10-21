export type EntryRoute = '/(auth)/sign-in' | '/(app)/link' | '/(app)/matches'

export type EntryInput = {
  loading: boolean
  signedIn: boolean
  /** null while unknown (query not resolved yet). */
  linked: boolean | null
}

/** Where the app's index should redirect. `null` means "not decidable yet, keep waiting". */
export function resolveEntryRoute(input: EntryInput): EntryRoute | null {
  if (input.loading) return null
  if (!input.signedIn) return '/(auth)/sign-in'
  if (input.linked === null) return null
  return input.linked ? '/(app)/matches' : '/(app)/link'
}
