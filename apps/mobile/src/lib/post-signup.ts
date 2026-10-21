import { REGIONS, type Region } from '@lpp/shared'

/** User metadata we attach at sign-up (survives email confirmation, applied on first signed-in launch). */
export type PendingSignupMetadata = {
  display_name?: string | null
  pending_riot_game_name?: string | null
  pending_riot_tag_line?: string | null
  pending_region?: string | null
}

export type PostSignupAction =
  | { type: 'set-display-name'; displayName: string }
  | { type: 'link-riot-account'; gameName: string; tagLine: string; region: Region }
  | { type: 'clear-pending' }

export function planPostSignupSetup(
  meta: PendingSignupMetadata,
  state: { hasLinkedAccount: boolean; displayName: string | null },
): PostSignupAction[] {
  const actions: PostSignupAction[] = []
  if (meta.display_name && !state.displayName) {
    actions.push({ type: 'set-display-name', displayName: meta.display_name })
  }
  if (meta.pending_riot_game_name && meta.pending_riot_tag_line) {
    if (state.hasLinkedAccount) {
      actions.push({ type: 'clear-pending' })
    } else {
      const region = (REGIONS as readonly string[]).includes(meta.pending_region ?? '')
        ? (meta.pending_region as Region)
        : 'NA'
      actions.push({
        type: 'link-riot-account',
        gameName: meta.pending_riot_game_name,
        tagLine: meta.pending_riot_tag_line,
        region,
      })
    }
  }
  return actions
}
