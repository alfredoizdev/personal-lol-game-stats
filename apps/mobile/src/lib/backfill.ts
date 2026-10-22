/** Own-history backfill: up to 100 games, fetched in chunks on the player's request (spec 5.3). */
export const BACKFILL_COUNT = 100
export const CHUNK = 20

/** The next ids to fetch: the first `size` not yet cached, in list order. Resumable by construction. */
export function nextChunk(ids: string[], cached: ReadonlySet<string>, size = CHUNK): string[] {
  const out: string[] = []
  for (const id of ids) {
    if (cached.has(id)) continue
    out.push(id)
    if (out.length >= size) break
  }
  return out
}
