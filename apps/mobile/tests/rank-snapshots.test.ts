import { describe, it, expect, vi } from 'vitest'
import { fetchRankSnapshots, recordRankSnapshots, rowToSnapshot } from '../src/lib/rank-snapshots'

const row = { queue: 'solo', tier: 'GOLD', division: 'III', league_points: 45, wins: 14, losses: 25, taken_at: '2026-10-27T12:00:00.000Z' }
const rank = { solo: { queue: 'solo' as const, tier: 'GOLD', division: 'III', leaguePoints: 63, wins: 15, losses: 25 }, flex: null, level: 291 }

function fakeClient(rows: unknown[]) {
  const insert = vi.fn().mockResolvedValue({ error: null })
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order']) chain[m] = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockResolvedValue({ data: rows, error: null })
  const from = vi.fn().mockReturnValue({ ...chain, insert })
  return { client: { from } as never, insert }
}

describe('rank snapshots (LP per game, owner 2026-10-27)', () => {
  it('maps a table row to a snapshot', () => {
    expect(rowToSnapshot(row)).toEqual({ queue: 'solo', tier: 'GOLD', division: 'III', leaguePoints: 45, wins: 14, losses: 25, takenAt: '2026-10-27T12:00:00.000Z' })
    expect(rowToSnapshot({ ...row, queue: 'tft' })).toBeNull()
  })
  it('fetches the account\'s snapshots oldest first', async () => {
    const { client } = fakeClient([{ ...row, taken_at: '2026-10-27T13:00:00.000Z' }, row])
    const out = await fetchRankSnapshots(client, 'u1', 'p1')
    expect(out.map((s) => s.takenAt)).toEqual(['2026-10-27T12:00:00.000Z', '2026-10-27T13:00:00.000Z'])
  })
  it('records a snapshot per queue only when the standing moved since the newest stored one', async () => {
    const { client, insert } = fakeClient([])
    const stored = [rowToSnapshot(row)!]
    const inserted = await recordRankSnapshots(client, 'u1', 'p1', rank, stored, '2026-10-27T14:00:00.000Z')
    expect(inserted).toBe(1)
    expect(insert).toHaveBeenCalledWith([{ user_id: 'u1', puuid: 'p1', queue: 'solo', tier: 'GOLD', division: 'III', league_points: 63, wins: 15, losses: 25, taken_at: '2026-10-27T14:00:00.000Z' }])
    const same = await recordRankSnapshots(client, 'u1', 'p1', { ...rank, solo: { ...rank.solo, leaguePoints: 45, wins: 14 } }, stored, '2026-10-27T15:00:00.000Z')
    expect(same).toBe(0)
  })
})
