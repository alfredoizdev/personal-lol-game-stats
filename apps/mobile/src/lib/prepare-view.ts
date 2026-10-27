import { playedRoles, ROLE_LABEL, type ChampSelectPick, type GoalMetric, type MatchSummary, type Role, type StoredGoal } from '@lpp/shared'

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

export type GoalEditorInitial = { mode: 'recommended'; metric: null } | { mode: 'fixed'; metric: GoalMetric; target: number }

/**
 * Where the editor starts (2026-10-26): "recommended for my role" unless the
 * player saved a fixed metric and number (a standing row with a target).
 */
export function goalEditorInitial(standing: Pick<StoredGoal, 'metric' | 'target'> | null): GoalEditorInitial {
  if (!standing || standing.target === null) return { mode: 'recommended', metric: null }
  return { mode: 'fixed', metric: standing.metric, target: standing.target }
}
