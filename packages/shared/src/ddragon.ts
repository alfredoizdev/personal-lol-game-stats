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
