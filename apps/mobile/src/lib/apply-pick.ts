import type { ChampSelectPick, Role } from '@lpp/shared'

export type PrepareSelection = { role: Role; championId: number | null }

/** Prepare follows your champion select: the assigned role and the locked champion replace the manual pick; unknown parts keep the current value. */
export function applyPick(current: PrepareSelection, pick: ChampSelectPick): PrepareSelection {
  const role = pick.position ?? current.role
  const championId = pick.championId ?? current.championId
  return role === current.role && championId === current.championId ? current : { role, championId }
}
