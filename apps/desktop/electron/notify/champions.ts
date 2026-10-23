import { championIdByName, championJsonUrl, DDRAGON_FALLBACK_VERSION, DDRAGON_VERSIONS_URL, parseChampionJson, type ChampionEntry } from '@lpp/shared'

export type ChampionLookup = { idByName(name: string): Promise<number | null> }

/**
 * Live Client champion name → Data Dragon numeric id, from champion.json of
 * the current version. Downloaded once per process (per version), like the
 * phone does; null while unavailable so the caller falls back to a role goal.
 */
export function createChampionLookup(fetchFn: typeof fetch): ChampionLookup {
  let list: Promise<ChampionEntry[]> | null = null

  const load = async (): Promise<ChampionEntry[]> => {
    let version = DDRAGON_FALLBACK_VERSION
    try {
      const versions = (await (await fetchFn(DDRAGON_VERSIONS_URL)).json()) as unknown
      if (Array.isArray(versions) && typeof versions[0] === 'string') version = versions[0]
    } catch {
      /* fallback version */
    }
    const res = await fetchFn(championJsonUrl(version))
    if (!res.ok) throw new Error(`champion.json: HTTP ${res.status}`)
    return parseChampionJson(await res.json())
  }

  return {
    async idByName(name) {
      list = list ?? load()
      try {
        return championIdByName(await list, name)
      } catch {
        list = null // retry next time
        return null
      }
    },
  }
}
