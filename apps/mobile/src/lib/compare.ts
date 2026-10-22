/** You-vs-enemy helpers shared by the Live matchup table and the Match Review lane matchup. */

export type Cmp = 'me' | 'enemy' | 'tie'

/**
 * Fractions (summing to 1) for the two-sided bar: the better side takes more
 * room. Lower-is-better metrics (deaths) invert so the bigger side is still the
 * better side; 0 vs 0 splits evenly; null when either value is missing.
 */
export function shareOf(me: number | null, enemy: number | null, lowerIsBetter = false): { me: number; enemy: number } | null {
  if (me === null || enemy === null) return null
  if (me === 0 && enemy === 0) return { me: 0.5, enemy: 0.5 }
  if (lowerIsBetter) {
    if (me === 0) return { me: 1, enemy: 0 }
    if (enemy === 0) return { me: 0, enemy: 1 }
    const m = enemy / (me + enemy)
    return { me: m, enemy: 1 - m }
  }
  const total = me + enemy
  const m = total > 0 ? me / total : 0.5
  return { me: m, enemy: 1 - m }
}

export function cmp(me: number | null, enemy: number | null, lowerIsBetter = false): Cmp {
  if (me === null || enemy === null || me === enemy) return 'tie'
  const meBetter = lowerIsBetter ? me < enemy : me > enemy
  return meBetter ? 'me' : 'enemy'
}

/** "+2", "-1.1"; undefined when either side is missing. */
export function signed(me: number | null, enemy: number | null, decimals = 0): string | undefined {
  if (me === null || enemy === null) return undefined
  const d = me - enemy
  return `${d >= 0 ? '+' : ''}${d.toFixed(decimals)}`
}
