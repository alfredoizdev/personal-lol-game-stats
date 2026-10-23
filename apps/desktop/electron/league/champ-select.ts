import type { ChampSelectPick, Role } from '@lpp/shared'

const POSITION: Record<string, Role> = { top: 'TOP', jungle: 'JUNGLE', middle: 'MIDDLE', bottom: 'BOTTOM', utility: 'UTILITY' }

/**
 * My own cell from `/lol-champ-select/v1/session`: the champion I locked (0 =
 * none yet) and the position the client assigned me. Nothing about teammates
 * or the enemy team is read.
 */
export function champSelectPick(raw: unknown): ChampSelectPick | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as { localPlayerCellId?: unknown; myTeam?: unknown }
  if (typeof s.localPlayerCellId !== 'number' || !Array.isArray(s.myTeam)) return null
  const me = (s.myTeam as Array<{ cellId?: unknown; championId?: unknown; assignedPosition?: unknown }>).find((c) => c?.cellId === s.localPlayerCellId)
  if (!me) return null
  const championId = typeof me.championId === 'number' && me.championId > 0 ? me.championId : null
  const position = typeof me.assignedPosition === 'string' ? (POSITION[me.assignedPosition.toLowerCase()] ?? null) : null
  return { championId, position }
}
