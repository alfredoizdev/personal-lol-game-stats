import { describe, it, expect, vi } from 'vitest'
import { fetchLinkedAccount, fetchLinkedAccounts, linkRiotAccount } from '../src/lib/linked-account'

/** Table-aware fake: `linked_riot_accounts` resolves to `rows`, `profiles` to `profile`. */
function fakeSelectClient(rows: unknown[], profile: { current_puuid: string | null } | null = null) {
  return {
    from: vi.fn((table: string) => {
      const result = table === 'profiles' ? { data: profile, error: null } : { data: rows, error: null }
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => result),
        then: (resolve: (v: typeof result) => void) => resolve(result),
      }
      return chain
    }),
  }
}

function fakeFunctionsClient(result: { data?: unknown; error?: { context?: { status?: number }; message?: string } }) {
  return { functions: { invoke: vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })) } }
}

describe('fetchLinkedAccount', () => {
  it('returns null when the user has no linked account', async () => {
    const client = fakeSelectClient([])
    await expect(fetchLinkedAccount(client as never, 'u1')).resolves.toBeNull()
  })

  it('maps platform to region', async () => {
    const client = fakeSelectClient([
      { puuid: 'p1', riot_id_game_name: 'Name', riot_id_tag_line: 'EUW', platform: 'euw1', profile_icon_id: 4321, last_seen_at: '2026-10-21' },
    ])
    await expect(fetchLinkedAccount(client as never, 'u1')).resolves.toEqual({
      puuid: 'p1',
      gameName: 'Name',
      tagLine: 'EUW',
      region: 'EUW',
      profileIconId: 4321,
    })
  })

  it('picks the account named by profiles.current_puuid over the most recent one', async () => {
    const client = fakeSelectClient(
      [
        { puuid: 'recent', riot_id_game_name: 'R', riot_id_tag_line: 'NA1', platform: 'na1', profile_icon_id: null, last_seen_at: '2026-10-21' },
        { puuid: 'chosen', riot_id_game_name: 'C', riot_id_tag_line: 'NA1', platform: 'na1', profile_icon_id: null, last_seen_at: '2026-10-01' },
      ],
      { current_puuid: 'chosen' },
    )
    const active = await fetchLinkedAccount(client as never, 'u1')
    expect(active?.puuid).toBe('chosen')
  })
})

describe('fetchLinkedAccounts', () => {
  it('returns every linked account, mapped', async () => {
    const client = fakeSelectClient([
      { puuid: 'p1', riot_id_game_name: 'A', riot_id_tag_line: 'NA1', platform: 'na1', profile_icon_id: 1, last_seen_at: '2026-10-21' },
      { puuid: 'p2', riot_id_game_name: 'B', riot_id_tag_line: 'EUW', platform: 'euw1', profile_icon_id: null, last_seen_at: '2026-10-20' },
    ])
    await expect(fetchLinkedAccounts(client as never, 'u1')).resolves.toEqual([
      { puuid: 'p1', gameName: 'A', tagLine: 'NA1', region: 'NA', profileIconId: 1 },
      { puuid: 'p2', gameName: 'B', tagLine: 'EUW', region: 'EUW', profileIconId: null },
    ])
  })
})

describe('linkRiotAccount', () => {
  const input = { gameName: 'Name', tagLine: 'NA1', region: 'NA' as const }

  it('returns the puuid on success', async () => {
    const client = fakeFunctionsClient({ data: { puuid: 'p1' } })
    await expect(linkRiotAccount(client as never, input)).resolves.toEqual({ ok: true, puuid: 'p1' })
  })

  it('maps a 404 to NOT_FOUND', async () => {
    const client = fakeFunctionsClient({ error: { context: { status: 404 }, message: 'x' } })
    await expect(linkRiotAccount(client as never, input)).resolves.toEqual({ ok: false, code: 'NOT_FOUND' })
  })

  it('maps a 429 to RATE_LIMITED', async () => {
    const client = fakeFunctionsClient({ error: { context: { status: 429 }, message: 'x' } })
    await expect(linkRiotAccount(client as never, input)).resolves.toEqual({ ok: false, code: 'RATE_LIMITED' })
  })

  it('maps anything else to UNKNOWN', async () => {
    const client = fakeFunctionsClient({ error: { context: { status: 500 }, message: 'boom' } })
    await expect(linkRiotAccount(client as never, input)).resolves.toEqual({ ok: false, code: 'UNKNOWN' })
  })
})
