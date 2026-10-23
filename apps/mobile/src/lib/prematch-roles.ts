import AsyncStorage from '@react-native-async-storage/async-storage'
import { playedRoles, type MatchSummary, type Role } from '@lpp/shared'

const KEY = 'lpp.prematch.roles'
const ROLES: readonly Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

/** The two roles you queue with, as in the client (a device preference, never shared). */
export type RolePair = { primary: Role; secondary: Role }

/** First time: your most played role and the next; a different second role when only one was played. */
export function defaultRoles(summaries: MatchSummary[]): RolePair {
  const played = playedRoles(summaries)
  const primary = played[0]?.role ?? 'MIDDLE'
  const secondary = played[1]?.role ?? ROLES.find((r) => r !== primary && (primary === 'MIDDLE' ? r === 'BOTTOM' : r === 'MIDDLE'))!
  return { primary, secondary }
}

export async function loadRoles(): Promise<RolePair | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<RolePair>
    if (!ROLES.includes(v.primary as Role) || !ROLES.includes(v.secondary as Role)) return null
    return { primary: v.primary as Role, secondary: v.secondary as Role }
  } catch {
    return null
  }
}

export async function saveRoles(pair: RolePair): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(pair))
  } catch {
    /* best effort */
  }
}
