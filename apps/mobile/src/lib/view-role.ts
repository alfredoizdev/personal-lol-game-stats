import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Role } from '@lpp/shared'

const KEY = 'lpp.prepare.viewRole'
const ROLES: readonly string[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

/** The role you last tapped to look at in Prepare (a device convenience; champion select still overrides). */
export async function loadViewRole(): Promise<Role | null> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    return v && ROLES.includes(v) ? (v as Role) : null
  } catch {
    return null
  }
}

export async function saveViewRole(role: Role): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, role)
  } catch {
    /* best effort */
  }
}
