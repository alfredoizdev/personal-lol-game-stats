import { defaultMetricFor, playedRoles, ROLE_LABEL, type ChampionEntry, type ChampSelectPick, type GoalMetric, type MatchSummary, type Role, type StoredGoal } from '@lpp/shared'

/** The role Prepare shows by itself: your most played; mid before any game is loaded. Nothing to choose. */
export function homeRole(summaries: MatchSummary[]): Role {
  return playedRoles(summaries)[0]?.role ?? 'MIDDLE'
}

/** The role Prepare shows: the one champion select assigned, else the one you are viewing, else your primary. */
export function activeRole({ pick, viewing, primary }: { pick: ChampSelectPick | null; viewing: Role | null; primary: Role }): Role {
  return pick?.position ?? viewing ?? primary
}

/** The champion select line; null outside champion select. */
export function prepareHeadline(pick: ChampSelectPick | null, championName: string | null): string | null {
  if (!pick) return null
  const role = pick.position ? ROLE_LABEL[pick.position] : null
  if (pick.championId !== null && championName) return `Playing ${championName}${role ? ` · ${role}` : ''}`
  return role ? `Champion select · ${role}` : 'Champion select'
}

/** The Data Dragon image key for the avatar beside the champion select line (owner, 2026-10-29); null until a champion is locked and known. */
export function pickedPortrait(pick: ChampSelectPick | null, champion: ChampionEntry | null): string | null {
  if (!pick || pick.championId === null || !champion) return null
  return champion.imageKey
}

/**
 * What Save goal stores: null while the editor still shows the recommended
 * value (the number then follows the role you end up playing), the number
 * once the player moved away from it.
 */
export function standingTarget(editor: number, recommended: number | null): number | null {
  return editor === recommended ? null : editor
}

/**
 * Where the one editor starts (owner, 2026-10-27: the player picks the metric,
 * the number follows the role): the saved metric, else the shown role's first
 * metric; the saved fixed number, else null (recommended for the role).
 */
export function goalEditorInitial(standing: Pick<StoredGoal, 'metric' | 'target'> | null, role: Role): { metric: GoalMetric; target: number | null } {
  if (!standing) return { metric: defaultMetricFor(role), target: null }
  return { metric: standing.metric, target: standing.target }
}
