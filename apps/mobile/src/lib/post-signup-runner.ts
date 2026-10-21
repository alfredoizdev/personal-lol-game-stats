import type { SupabaseClient, User } from '@supabase/supabase-js'
import { planPostSignupSetup, type PendingSignupMetadata } from './post-signup'
import { linkRiotAccount } from './linked-account'
import { setActiveAccount } from './account'

/**
 * Applies what the user typed at sign-up once they are signed in: display
 * name, and the Riot ID they entered (linked via the Edge Function). Safe to
 * call on every signed-in launch; it clears the pending metadata when done.
 */
export async function runPostSignupSetup(
  client: SupabaseClient,
  user: User,
  state: { hasLinkedAccount: boolean },
): Promise<{ linked: boolean }> {
  const meta = (user.user_metadata ?? {}) as PendingSignupMetadata
  const { data: profile } = await client.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
  const displayName = (profile as { display_name?: string | null } | null)?.display_name ?? null
  const plan = planPostSignupSetup(meta, { hasLinkedAccount: state.hasLinkedAccount, displayName })

  let linked = false
  for (const action of plan) {
    if (action.type === 'set-display-name') {
      await client.from('profiles').update({ display_name: action.displayName }).eq('user_id', user.id)
    } else if (action.type === 'link-riot-account') {
      const result = await linkRiotAccount(client, action)
      if (result.ok) {
        await setActiveAccount(client, user.id, result.puuid).catch(() => {})
        linked = true
      }
      // On failure the pending data stays so the user can retry from the link screen.
      if (!result.ok) continue
      await clearPending(client)
    } else if (action.type === 'clear-pending') {
      await clearPending(client)
    }
  }
  return { linked }
}

async function clearPending(client: SupabaseClient): Promise<void> {
  await client.auth
    .updateUser({ data: { pending_riot_game_name: null, pending_riot_tag_line: null, pending_region: null } })
    .catch(() => {})
}
