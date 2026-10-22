import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchV5, Region } from '@lpp/shared'

export type RiotErrorCode = 'KEY_INVALID' | 'RATE_LIMITED' | 'NOT_FOUND' | 'UNKNOWN'

export class RiotApiError extends Error {
  code: RiotErrorCode
  constructor(code: RiotErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'RiotApiError'
    this.code = code
  }
}

const CODES: readonly string[] = ['KEY_INVALID', 'RATE_LIMITED', 'NOT_FOUND', 'UNKNOWN']

function codeFromStatus(status: number | undefined): RiotErrorCode {
  if (status === 401) return 'KEY_INVALID'
  if (status === 404) return 'NOT_FOUND'
  if (status === 429) return 'RATE_LIMITED'
  return 'UNKNOWN'
}

/** Shared invoke wrapper: Edge Function `{ error }` bodies and HTTP errors become RiotApiError. */
async function invoke<T>(client: SupabaseClient, fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.functions.invoke(fn, { body })
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status
    throw new RiotApiError(codeFromStatus(status), (error as { message?: string }).message)
  }
  const errCode = (data as { error?: unknown } | null)?.error
  if (typeof errCode === 'string') {
    throw new RiotApiError(CODES.includes(errCode) ? (errCode as RiotErrorCode) : 'UNKNOWN')
  }
  return data as T
}

export async function fetchMatchIds(
  client: SupabaseClient,
  input: { gameName: string; tagLine: string; region: Region; count?: number },
): Promise<string[]> {
  const body = { gameName: input.gameName, tagLine: input.tagLine, region: input.region, count: input.count ?? 20 }
  const data = await invoke<{ ids?: unknown }>(client, 'match-list-ids', body)
  if (!Array.isArray(data?.ids)) throw new RiotApiError('UNKNOWN', 'match-list-ids: no ids in response')
  return data.ids.filter((id): id is string => typeof id === 'string')
}

/** Tiny semaphore: the dev key allows 20 req/s, so never fire the 20 detail calls at once. */
function createLimiter(max: number) {
  let active = 0
  const queue: Array<() => void> = []
  const next = () => {
    active--
    queue.shift()?.()
  }
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => queue.push(resolve))
    active++
    try {
      return await task()
    } finally {
      next()
    }
  }
}

const detailLimiter = createLimiter(4)

export async function fetchMatchDetail(
  client: SupabaseClient,
  input: { matchId: string; region: Region },
): Promise<MatchV5> {
  const data = await detailLimiter(() =>
    invoke<MatchV5>(client, 'match-detail', { matchId: input.matchId, region: input.region }),
  )
  if (!data || typeof data !== 'object' || !('info' in data)) throw new RiotApiError('UNKNOWN', 'match-detail: bad blob')
  return data
}

/** Retry only when a retry can change the outcome. */
export function isRetryableRiotError(err: unknown): boolean {
  if (err instanceof RiotApiError) return err.code === 'RATE_LIMITED' || err.code === 'UNKNOWN'
  return true
}

export function riotErrorCode(err: unknown): RiotErrorCode {
  return err instanceof RiotApiError ? err.code : 'UNKNOWN'
}
