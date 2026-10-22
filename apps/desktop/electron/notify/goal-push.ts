import type { SupabaseClient } from '@supabase/supabase-js'
import {
  goalFor,
  initialNotifierState,
  nextNotification,
  rowToGoal,
  type Goal,
  type GoalPushMode,
  type GoalRow,
  type NotifierState,
} from '@lpp/shared'
import type { LiveState } from '../league/live-poller'
import { sendExpoPush, type ExpoPushMessage } from './expo-push'
import type { ChampionLookup } from './champions'

export type GoalPushLogger = { info(m: string): void; warn(m: string): void }

export type GoalPushOptions = {
  fetch?: typeof fetch
  log: GoalPushLogger
  champions: ChampionLookup
  /** The Riot ID League is signed in with (LCU); matched case-insensitively against linked_riot_accounts. */
  identity: () => { gameName: string; tagLine: string } | null
  now?: () => number
}

export type GoalPush = { onLiveState(state: LiveState): Promise<void>; reset(): void }

/** Re-read prefs, tokens, goals and linked accounts at most this often while a game runs. */
export const CONTEXT_TTL_MS = 60_000
export const PUSH_ROUTE = '/(app)/(tabs)/live'
const MAX_GOAL_ROWS = 200

type Context = {
  loadedAt: number
  goalPush: boolean
  mode: GoalPushMode
  tokens: Array<{ id: string; expoToken: string }>
  linked: Array<{ puuid: string; gameName: string; tagLine: string }>
  goals: Goal[]
}

/**
 * Turns live states into status-only goal pushes for this user. Everything is
 * read with the user's own JWT (RLS own rows); nothing is sent unless
 * notification_prefs.goal_push is true. Never throws: failures are logged
 * and the notifier state is left untouched so the next snapshot retries.
 */
export function createGoalPush(client: SupabaseClient, userId: string, opts: GoalPushOptions): GoalPush {
  const fetchFn = opts.fetch ?? globalThis.fetch
  const now = opts.now ?? Date.now
  let notifier: NotifierState = initialNotifierState
  let ctx: Context | null = null
  let inFlight = false
  let pending: LiveState | null = null // newest state that arrived while busy; processed right after
  let warnedIdentity = false

  const loadContext = async (): Promise<Context> => {
    const [prefs, tokens, linked, goals] = await Promise.all([
      client.from('notification_prefs').select('goal_push, goal_push_mode').eq('user_id', userId).maybeSingle(),
      client.from('lanepulse_push_tokens').select('id, expo_token').eq('user_id', userId).is('revoked_at', null),
      client.from('linked_riot_accounts').select('puuid, riot_id_game_name, riot_id_tag_line').eq('user_id', userId),
      client.from('pre_match_focus').select('puuid, champion_id, role, metric, target, set_at').eq('user_id', userId).order('set_at', { ascending: false }).limit(MAX_GOAL_ROWS),
    ])
    for (const r of [prefs, tokens, linked, goals]) if (r.error) throw new Error(r.error.message)
    const p = prefs.data as { goal_push?: boolean; goal_push_mode?: string } | null
    return {
      loadedAt: now(),
      goalPush: p?.goal_push === true,
      mode: p?.goal_push_mode === 'interval' ? 'interval' : 'change',
      tokens: ((tokens.data ?? []) as Array<{ id: string; expo_token: string }>).map((t) => ({ id: t.id, expoToken: t.expo_token })),
      linked: ((linked.data ?? []) as Array<{ puuid: string; riot_id_game_name: string; riot_id_tag_line: string }>).map((a) => ({
        puuid: a.puuid,
        gameName: a.riot_id_game_name,
        tagLine: a.riot_id_tag_line,
      })),
      goals: ((goals.data ?? []) as GoalRow[]).map(rowToGoal).filter((g): g is Goal => g !== null),
    }
  }

  const revoke = async (tokenId: string) => {
    const { error } = await client.from('lanepulse_push_tokens').update({ revoked_at: new Date(now()).toISOString() }).eq('id', tokenId)
    if (error) throw new Error(error.message)
  }

  const handle = async (state: LiveState): Promise<void> => {
    if (state.kind !== 'live' && state.kind !== 'ended') {
      notifier = initialNotifierState // next game starts fresh
      return
    }
    if (!ctx || now() - ctx.loadedAt > CONTEXT_TTL_MS) ctx = await loadContext()
    if (!ctx.goalPush || ctx.tokens.length === 0) return

    const id = opts.identity()
    const me = id
      ? ctx.linked.find((a) => a.gameName.toLowerCase() === id.gameName.toLowerCase() && a.tagLine.toLowerCase() === id.tagLine.toLowerCase())
      : undefined
    if (!me) {
      if (!warnedIdentity) opts.log.warn('goal push: League is signed in with a Riot ID that is not linked in LanePulse')
      warnedIdentity = true
      return
    }
    const { snapshot } = state
    if (!snapshot.me.position) return
    const championId = await opts.champions.idByName(snapshot.me.championName)
    const goal = goalFor(ctx.goals, me.puuid, championId, snapshot.me.position)
    if (!goal) return

    const next = nextNotification(notifier, { goal, snapshot, mode: ctx.mode, ended: state.kind === 'ended' })
    if (!next.due) {
      notifier = next.state
      return
    }
    const messages: ExpoPushMessage[] = ctx.tokens.map((t) => ({
      to: t.expoToken,
      title: next.due!.title,
      body: next.due!.body,
      data: { app: 'lanepulse', route: PUSH_ROUTE },
      channelId: 'goals',
      priority: 'high',
    }))
    const results = await sendExpoPush(fetchFn, messages)
    notifier = next.state // sent (or at least accepted): advance even if some tickets failed
    opts.log.info(`goal push: ${next.due.kind} sent to ${results.filter((r) => r.ok).length}/${results.length} device(s)`)
    for (const r of results) {
      if (!r.deviceNotRegistered) continue
      const token = ctx.tokens.find((t) => t.expoToken === r.token)
      if (!token) continue
      ctx.tokens = ctx.tokens.filter((t) => t.id !== token.id)
      await revoke(token.id)
    }
  }

  const guarded = async (state: LiveState) => {
    try {
      await handle(state)
    } catch (err) {
      opts.log.warn(`goal push: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return {
    async onLiveState(state) {
      // The poller ticks every couple of seconds; never queue behind a slow
      // network, but never lose the newest state either (the single `ended`).
      if (inFlight) {
        pending = state
        return
      }
      inFlight = true
      try {
        await guarded(state)
        while (pending) {
          const next = pending
          pending = null
          await guarded(next)
        }
      } finally {
        inFlight = false
      }
    },
    reset() {
      notifier = initialNotifierState
      ctx = null
      pending = null
      warnedIdentity = false
    },
  }
}
