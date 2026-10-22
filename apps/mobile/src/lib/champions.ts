import { championImageKey } from '@lpp/shared'

export type ChampionEntry = { id: number; name: string; imageKey: string }

const CDN = 'https://ddragon.leagueoflegends.com/cdn'

export function championJsonUrl(version: string): string {
  return `${CDN}/${version}/data/en_US/champion.json`
}

/** Data Dragon champion.json → [{ id (numeric key), name (display), imageKey (file key) }], sorted by name. */
export function parseChampionJson(json: unknown): ChampionEntry[] {
  const data = (json as { data?: Record<string, { id?: unknown; key?: unknown; name?: unknown }> } | null)?.data
  if (!data || typeof data !== 'object') return []
  const out: ChampionEntry[] = []
  for (const c of Object.values(data)) {
    const id = Number(c?.key)
    if (!Number.isInteger(id) || id <= 0 || typeof c?.name !== 'string' || typeof c?.id !== 'string') continue
    out.push({ id, name: c.name, imageKey: c.id })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Live Client / Match-v5 display name → numeric champion id. Goes through the
 * same special-name table the icons use ("Wukong" → MonkeyKing), then a
 * case-insensitive name match. Null when unknown: the caller must fall back.
 */
export function championIdByName(list: ChampionEntry[], liveName: string): number | null {
  const key = championImageKey(liveName).toLowerCase()
  const byKey = list.find((c) => c.imageKey.toLowerCase() === key)
  if (byKey) return byKey.id
  const lower = liveName.trim().toLowerCase()
  return list.find((c) => c.name.toLowerCase() === lower)?.id ?? null
}
