import { describe, it, expect, vi } from 'vitest'
import type { LiveSnapshotV2 } from '@lpp/shared'
import { createGoalPush } from '@electron/notify/goal-push'
import type { LiveState } from '@electron/league/live-poller'

type Row = Record<string, unknown>
type Tables = { notification_prefs?: Row | null; lanepulse_push_tokens?: Row[]; linked_riot_accounts?: Row[]; pre_match_focus?: Row[] }

/** Minimal chainable Supabase fake: every builder resolves to the table's rows; updates are recorded. */
function fakeClient(tables: Tables) {
  const updates: Array<{ table: string; values: Row; eq: [string, unknown] }> = []
  const client = {
    from: vi.fn((table: string) => {
      const rows = (tables as Record<string, unknown>)[table]
      const single = table === 'notification_prefs'
      let update: Row | null = null
      const b: Record<string, unknown> = {}
      const chain = () => b
      b.select = chain
      b.eq = (col: string, v: unknown) => {
        if (update) updates.push({ table, values: update, eq: [col, v] })
        return b
      }
      b.is = chain
      b.order = chain
      b.limit = chain
      b.maybeSingle = chain
      b.update = (values: Row) => {
        update = values
        return b
      }
      b.then = (resolve: (v: unknown) => void) => resolve({ data: update ? null : single ? (rows ?? null) : (rows ?? []), error: null })
      return b
    }),
  }
  return { client, updates }
}

function snap(gameTimeSeconds: number, csPerMin: number, championName = 'Yasuo'): LiveSnapshotV2 {
  return {
    v: 2, ts: 1, isFinal: false, gameTimeSeconds, gameMode: 'CLASSIC', queueId: 420, teamKills: 5,
    me: { championName, position: 'MIDDLE', level: 5, kills: 1, deaths: 0, assists: 1, cs: 50, csPerMin, wardScore: 2, items: [] },
    opponent: null, focus: null,
  }
}
const live = (s: LiveSnapshotV2): LiveState => ({ kind: 'live', snapshot: s })
const ended = (s: LiveSnapshotV2): LiveState => ({ kind: 'ended', snapshot: s })

const goalRow = { puuid: 'P1', champion_id: 157, role: 'MIDDLE', metric: 'csPerMin', target: '7', set_at: '2026-10-20T00:00:00Z' }
const base: Tables = {
  notification_prefs: { goal_push: true, goal_push_mode: 'change' },
  lanepulse_push_tokens: [{ id: 't1', expo_token: 'ExponentPushToken[a]' }, { id: 't2', expo_token: 'ExponentPushToken[b]' }],
  linked_riot_accounts: [{ puuid: 'P1', riot_id_game_name: 'Hexed', riot_id_tag_line: '7551' }],
  pre_match_focus: [goalRow],
}

function okFetch(tickets: unknown[] = [{ status: 'ok' }, { status: 'ok' }]) {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: tickets }) })) as unknown as typeof fetch & { mock: { calls: [string, RequestInit][] } }
}
const log = () => ({ info: vi.fn(), warn: vi.fn() })
const champions = { idByName: async (name: string) => (name === 'Yasuo' ? 157 : null) }
const identity = () => ({ gameName: 'hexed', tagLine: '7551' }) // case differs from the linked row on purpose

function make(tables: Tables, fetchFn: typeof fetch = okFetch(), l = log()) {
  const { client, updates } = fakeClient(tables)
  const gp = createGoalPush(client as never, 'u1', { fetch: fetchFn, log: l, champions, identity })
  return { gp, updates, fetchFn: fetchFn as ReturnType<typeof okFetch>, log: l, client }
}

describe('createGoalPush', () => {
  it('sends nothing when goal_push is off', async () => {
    const { gp, fetchFn } = make({ ...base, notification_prefs: { goal_push: false, goal_push_mode: 'change' } })
    await gp.onLiveState(live(snap(90, 7.5)))
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('posts one status message per active token with the exact payload', async () => {
    const { gp, fetchFn } = make(base)
    await gp.onLiveState(live(snap(90, 7.5)))
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const body = JSON.parse(String(fetchFn.mock.calls[0]![1].body))
    expect(body).toEqual([
      { to: 'ExponentPushToken[a]', title: 'LanePulse', body: '01:30 · Goal 7.0 CS/min · On track, now 7.5', data: { app: 'lanepulse', route: '/(app)/(tabs)/live' }, channelId: 'goals', priority: 'high' },
      { to: 'ExponentPushToken[b]', title: 'LanePulse', body: '01:30 · Goal 7.0 CS/min · On track, now 7.5', data: { app: 'lanepulse', route: '/(app)/(tabs)/live' }, channelId: 'goals', priority: 'high' },
    ])
    await gp.onLiveState(live(snap(200, 7.6)))
    expect(fetchFn).toHaveBeenCalledTimes(1) // same status → nothing
  })

  it('revokes a DeviceNotRegistered token and keeps sending to the other one', async () => {
    const f = okFetch([{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }])
    const { gp, updates, fetchFn } = make(base, f)
    await gp.onLiveState(live(snap(90, 7.5)))
    expect(updates).toEqual([{ table: 'lanepulse_push_tokens', values: { revoked_at: expect.any(String) }, eq: ['id', 't2'] }])
    await gp.onLiveState(live(snap(400, 6.0)))
    const body = JSON.parse(String(fetchFn.mock.calls[1]![1].body))
    expect(body.map((m: { to: string }) => m.to)).toEqual(['ExponentPushToken[a]'])
  })

  it('a rejecting fetch resolves, warns and leaves the state so the next snapshot retries', async () => {
    const f = vi.fn(async () => { throw new Error('offline') }) as unknown as typeof fetch
    const l = log()
    const { gp } = make(base, f, l)
    await expect(gp.onLiveState(live(snap(90, 7.5)))).resolves.toBeUndefined()
    expect(l.warn).toHaveBeenCalledTimes(1)
    await gp.onLiveState(live(snap(95, 7.5)))
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('sends nothing for a champion and role without a goal', async () => {
    const { gp, fetchFn } = make({ ...base, pre_match_focus: [{ ...goalRow, role: 'TOP' }] })
    await gp.onLiveState(live(snap(90, 7.5)))
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('sends nothing when the LCU identity is not one of the linked accounts', async () => {
    const { client, updates } = fakeClient(base)
    const f = okFetch()
    const gp = createGoalPush(client as never, 'u1', { fetch: f, log: log(), champions, identity: () => ({ gameName: 'Someone', tagLine: 'Else' }) })
    await gp.onLiveState(live(snap(90, 7.5)))
    expect(f).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })

  it('sends the final once at game end and starts over for the next game', async () => {
    const { gp, fetchFn } = make(base)
    await gp.onLiveState(live(snap(90, 7.5)))
    await gp.onLiveState(ended(snap(1500, 7.3)))
    await gp.onLiveState(ended(snap(1500, 7.3)))
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchFn.mock.calls[1]![1].body))[0].body).toBe('Game over · Goal met · 7.3 CS/min')
    await gp.onLiveState({ kind: 'idle' })
    await gp.onLiveState(live(snap(90, 7.5)))
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('reset() forgets the game in progress', async () => {
    const { gp, fetchFn } = make(base)
    await gp.onLiveState(live(snap(90, 7.5)))
    gp.reset()
    await gp.onLiveState(live(snap(100, 7.5)))
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})
