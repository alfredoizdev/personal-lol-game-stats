const CDN = 'https://ddragon.leagueoflegends.com/cdn'

/** Last known Data Dragon version; used while the live version list loads or fails. */
export const DDRAGON_FALLBACK_VERSION = '15.20.1'

/** Display names whose Data Dragon image key cannot be derived by stripping punctuation. */
const SPECIAL: Record<string, string> = {
  wukong: 'MonkeyKing',
  'nunu & willump': 'Nunu',
  'renata glasc': 'Renata',
  "cho'gath": 'Chogath',
  "kai'sa": 'Kaisa',
  "kha'zix": 'Khazix',
  "vel'koz": 'Velkoz',
  "bel'veth": 'Belveth',
  leblanc: 'Leblanc',
  fiddlesticks: 'Fiddlesticks',
}

/** Match-v5 `championName` → Data Dragon image key (`/img/champion/{key}.png`). */
export function championImageKey(championName: string): string {
  const special = SPECIAL[championName.trim().toLowerCase()]
  if (special) return special
  return championName.replace(/[\s'.]/g, '')
}

export function championIconUrl(version: string, championName: string): string {
  return `${CDN}/${version}/img/champion/${championImageKey(championName)}.png`
}

export function itemIconUrl(version: string, itemId: number): string {
  return `${CDN}/${version}/img/item/${itemId}.png`
}

export function profileIconUrl(version: string, profileIconId: number): string {
  return `${CDN}/${version}/img/profileicon/${profileIconId}.png`
}

export const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json'

/** Tall loading-screen art (308×560), versionless on the CDN. */
export function championLoadingArtUrl(championName: string): string {
  return `${CDN}/img/champion/loading/${championImageKey(championName)}_0.jpg`
}


// ---------------------------------------------------------------------------
// champion.json → numeric ids (shared by the phone's Prepare picker and the
// desktop's goal push, which must map the Live Client champion name to the
// Data Dragon key the goal was saved with).
// ---------------------------------------------------------------------------
export type ChampionEntry = { id: number; name: string; imageKey: string }

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
