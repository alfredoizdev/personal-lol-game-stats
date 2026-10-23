import { describe, expect, it } from 'vitest'
import { PERSIST_MAX_AGE_MS, shouldPersistQuery } from '@/lib/query-persist'

describe('shouldPersistQuery (what survives an app restart so the launch is instant)', () => {
  it('persists match details, the own-history id list, the Matches id list and the champion list', () => {
    expect(shouldPersistQuery(['match-detail', 'NA1_1'])).toBe(true)
    expect(shouldPersistQuery(['own-ids', 'puuid'])).toBe(true)
    expect(shouldPersistQuery(['match-ids', 'puuid', 20])).toBe(true)
    expect(shouldPersistQuery(['champions', '15.21.1'])).toBe(true)
  })
  it('does not persist goals, the linked account or anything else (fresh from Supabase each launch)', () => {
    expect(shouldPersistQuery(['goals', 'puuid'])).toBe(false)
    expect(shouldPersistQuery(['linked-accounts'])).toBe(false)
    expect(shouldPersistQuery([])).toBe(false)
  })
  it('keeps the cache a week: a game never changes, the id lists are refreshed on launch anyway', () => {
    expect(PERSIST_MAX_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
