import { RiotApiError } from './riot-api'

/** Own-history backfill: up to 100 games, fetched in chunks on the player's request (spec 5.3). */
export const BACKFILL_COUNT = 100
export const CHUNK = 20

/** The next ids to fetch: the first `size` not yet cached (and not skipped), in list order. Resumable by construction. */
export function nextChunk(ids: string[], cached: ReadonlySet<string>, size = CHUNK): string[] {
  const out: string[] = []
  for (const id of ids) {
    if (cached.has(id)) continue
    out.push(id)
    if (out.length >= size) break
  }
  return out
}

/** How many of the first `n` ids are cached (the Performance tab needs its 20-game window complete). */
export function cachedWithin(ids: string[], isCached: (id: string) => boolean, n: number): number {
  let count = 0
  for (const id of ids.slice(0, n)) if (isCached(id)) count += 1
  return count
}

export type BackfillResult = { fetched: number; failed: number; stoppedBy: unknown | null }

/**
 * One backfill run. Each id is tried at most once per run (a failed id is
 * skipped, never hammered); a Riot rate limit ends the run so the next press
 * retries later; `isPaused` holds the loop (a Match Review is open); `isCancelled`
 * ends it (unmount / account switch).
 */
export async function runBackfill(opts: {
  ids: string[]
  isCached: (id: string) => boolean
  fetchOne: (id: string) => Promise<unknown>
  isPaused: () => boolean
  onChunk: () => void
  isCancelled?: () => boolean
  chunkSize?: number
  pauseMs?: number
}): Promise<BackfillResult> {
  const skip = new Set<string>()
  let fetched = 0
  let failed = 0
  const done = (id: string) => opts.isCached(id) || skip.has(id)
  while (!opts.isCancelled?.()) {
    if (opts.isPaused()) {
      await new Promise((r) => setTimeout(r, opts.pauseMs ?? 1000))
      continue
    }
    const chunk = nextChunk(opts.ids, { has: done } as ReadonlySet<string>, opts.chunkSize ?? CHUNK)
    if (chunk.length === 0) break
    let rateLimited: unknown | null = null
    await Promise.all(
      chunk.map(async (id) => {
        try {
          await opts.fetchOne(id)
          fetched += 1
          skip.add(id) // even if the cache lookup lags, never refetch in this run
        } catch (e) {
          failed += 1
          skip.add(id)
          if (e instanceof RiotApiError && e.code === 'RATE_LIMITED') rateLimited = e
        }
      }),
    )
    opts.onChunk()
    if (rateLimited) return { fetched, failed, stoppedBy: rateLimited }
  }
  return { fetched, failed, stoppedBy: null }
}
