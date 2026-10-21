export type Region = 'NA' | 'EUW' | 'EUNE' | 'KR' | 'LAN' | 'BR' | 'JP' | 'OCE' | 'TR' | 'RU'

export const REGIONS: readonly Region[] = ['NA', 'EUW', 'EUNE', 'KR', 'LAN', 'BR', 'JP', 'OCE', 'TR', 'RU']

/** Same mapping as the `link-riot-account` Edge Function. */
export const REGION_TO_PLATFORM: Record<Region, string> = {
  NA: 'na1',
  EUW: 'euw1',
  EUNE: 'eun1',
  KR: 'kr',
  LAN: 'la1',
  BR: 'br1',
  JP: 'jp1',
  OCE: 'oc1',
  TR: 'tr1',
  RU: 'ru',
}

export function platformToRegion(platform: string | null): Region {
  if (!platform) return 'NA'
  for (const region of REGIONS) {
    if (REGION_TO_PLATFORM[region] === platform) return region
  }
  return 'NA'
}
