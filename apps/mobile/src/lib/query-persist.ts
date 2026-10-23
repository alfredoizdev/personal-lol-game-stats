/**
 * Instant launch (owner, 2026-10-23): the match cache survives an app restart.
 * Only data that does not change is persisted: match details, the id lists
 * (refreshed on launch anyway) and the champion list. Goals and the linked
 * account come fresh from Supabase every launch.
 */
const PERSISTED: readonly string[] = ['match-detail', 'own-ids', 'match-ids', 'champions']

export const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const PERSIST_KEY = 'lpp.query-cache.v1'

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === 'string' && PERSISTED.includes(queryKey[0])
}
