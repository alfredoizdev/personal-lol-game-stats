import { describe, it, expect, vi } from 'vitest'
import { fetchMatchIds, fetchMatchDetail, fetchRankedEntries, isRetryableRiotError, RiotApiError } from '../src/lib/riot-api'

function fakeClient(result: { data?: unknown; error?: { context?: { status?: number }; message?: string } }) {
  return { functions: { invoke: vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })) } }
}

const account = { gameName: 'Name', tagLine: 'NA1', region: 'NA' as const }

describe('fetchMatchIds', () => {
  it('returns the ids and sends the Riot ID, region and count', async () => {
    const client = fakeClient({ data: { ids: ['NA1_1', 'NA1_2'] } })
    await expect(fetchMatchIds(client as never, { ...account, count: 20 })).resolves.toEqual(['NA1_1', 'NA1_2'])
    expect(client.functions.invoke).toHaveBeenCalledWith('match-list-ids', {
      body: { gameName: 'Name', tagLine: 'NA1', region: 'NA', count: 20 },
    })
  })

  it('throws RATE_LIMITED from a body error', async () => {
    const client = fakeClient({ data: { error: 'RATE_LIMITED' } })
    await expect(fetchMatchIds(client as never, account)).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('maps an HTTP 401 invoke error to KEY_INVALID', async () => {
    const client = fakeClient({ error: { context: { status: 401 }, message: 'x' } })
    const err = await fetchMatchIds(client as never, account).catch((e) => e)
    expect(err).toBeInstanceOf(RiotApiError)
    expect(err.code).toBe('KEY_INVALID')
  })

  it('maps an HTTP 404 to NOT_FOUND and 429 to RATE_LIMITED', async () => {
    await expect(fetchMatchIds(fakeClient({ error: { context: { status: 404 } } }) as never, account)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(fetchMatchIds(fakeClient({ error: { context: { status: 429 } } }) as never, account)).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('maps anything else to UNKNOWN', async () => {
    await expect(fetchMatchIds(fakeClient({ error: { context: { status: 500 } } }) as never, account)).rejects.toMatchObject({ code: 'UNKNOWN' })
    await expect(fetchMatchIds(fakeClient({ data: { nope: true } }) as never, account)).rejects.toMatchObject({ code: 'UNKNOWN' })
  })
})

describe('fetchMatchDetail', () => {
  it('sends matchId and region and returns the blob', async () => {
    const blob = { metadata: { matchId: 'NA1_1', participants: [] }, info: { participants: [] } }
    const client = fakeClient({ data: blob })
    await expect(fetchMatchDetail(client as never, { matchId: 'NA1_1', region: 'NA' })).resolves.toBe(blob)
    expect(client.functions.invoke).toHaveBeenCalledWith('match-detail', { body: { matchId: 'NA1_1', region: 'NA' } })
  })

  it('throws NOT_FOUND from a body error', async () => {
    await expect(fetchMatchDetail(fakeClient({ data: { error: 'NOT_FOUND' } }) as never, { matchId: 'x', region: 'NA' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('isRetryableRiotError', () => {
  it('only RATE_LIMITED and UNKNOWN are retryable', () => {
    expect(isRetryableRiotError(new RiotApiError('RATE_LIMITED'))).toBe(true)
    expect(isRetryableRiotError(new RiotApiError('UNKNOWN'))).toBe(true)
    expect(isRetryableRiotError(new RiotApiError('KEY_INVALID'))).toBe(false)
    expect(isRetryableRiotError(new RiotApiError('NOT_FOUND'))).toBe(false)
    expect(isRetryableRiotError(new Error('plain'))).toBe(true)
  })
})

describe('fetchRankedEntries (the account rank, league-v4 by puuid through the ranked-entries function)', () => {
  it('sends puuid and region and returns the parsed solo and flex entries', async () => {
    const client = fakeClient({ data: { entries: [{ queueType: 'RANKED_SOLO_5x5', tier: 'GOLD', rank: 'II', leaguePoints: 45, wins: 12, losses: 8 }] } })
    await expect(fetchRankedEntries(client as never, { puuid: 'p1', region: 'NA' })).resolves.toEqual({
      solo: { queue: 'solo', tier: 'GOLD', division: 'II', leaguePoints: 45, wins: 12, losses: 8 },
      flex: null,
    })
    expect(client.functions.invoke).toHaveBeenCalledWith('ranked-entries', { body: { puuid: 'p1', region: 'NA' } })
  })
  it('maps errors like the other calls', async () => {
    await expect(fetchRankedEntries(fakeClient({ data: { error: 'RATE_LIMITED' } }) as never, { puuid: 'p1', region: 'NA' })).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })
})
