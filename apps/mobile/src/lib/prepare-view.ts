import { playedRoles, ROLE_LABEL, type ChampSelectPick, type MatchSummary, type Role } from '@lpp/shared'

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

/**
 * What Save goal stores: null while the editor still shows the recommended
 * value (resolved at game time to the role you end up playing), the number
 * once the player moved away from it.
 */
export function standingTarget(editor: number, recommended: number | null): number | null {
  return editor === recommended ? null : editor
}

/**
 * The editor when the metric is not scored for the role shown (CS for support) and
 * the player fixed no number: the role's own recommended goal is shown instead of a
 * dash, without a stepper; Save keeps "recommended for the role you play".
 */
export function goalEditorMode({ recommended, fixed }: { recommended: number | null; fixed: number | null }): 'edit' | 'fallback' {
  return recommended === null && fixed === null ? 'fallback' : 'edit'
}
