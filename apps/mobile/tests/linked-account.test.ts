import { describe, it, expect, vi } from 'vitest'
import { fetchLinkedAccount, linkRiotAccount } from '../src/lib/linked-account'

function fakeSelectClient(rows: unknown[]) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: rows, error: null })),
  }
  return { from: vi.fn(() => chain) }
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
      { puuid: 'p1', riot_id_game_name: 'Name', riot_id_tag_line: 'EUW', platform: 'euw1', last_seen_at: '2026-10-21' },
    ])
    await expect(fetchLinkedAccount(client as never, 'u1')).resolves.toEqual({
      puuid: 'p1',
      gameName: 'Name',
      tagLine: 'EUW',
      region: 'EUW',
    })
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
