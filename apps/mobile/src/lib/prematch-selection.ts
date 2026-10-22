import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Role } from '@lpp/shared'

const KEY = 'lpp.prematch.selection'
const ROLES: readonly string[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

export type PrematchSelection = { championId: number; role: Role }

/** Last champion + role picked on this device (a convenience, never shared). */
export async function loadSelection(): Promise<PrematchSelection | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<PrematchSelection>
    if (typeof v.championId !== 'number' || typeof v.role !== 'string' || !ROLES.includes(v.role)) return null
    return { championId: v.championId, role: v.role as Role }
  } catch {
    return null
  }
}

export async function saveSelection(sel: PrematchSelection): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(sel))
  } catch {
    /* best effort */
  }
}
