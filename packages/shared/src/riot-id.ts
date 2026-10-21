export type RiotId = { gameName: string; tagLine: string }

/** Parse "Name#TAG". Splits on the LAST '#', trims both halves, rejects empties. */
export function parseRiotId(input: string): RiotId | null {
  const trimmed = input.trim()
  const idx = trimmed.lastIndexOf('#')
  if (idx <= 0) return null
  const gameName = trimmed.slice(0, idx).trim()
  const tagLine = trimmed.slice(idx + 1).trim()
  if (!gameName || !tagLine) return null
  return { gameName, tagLine }
}

export function formatRiotId(gameName: string, tagLine: string): string {
  return `${gameName}#${tagLine}`
}
