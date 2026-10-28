import { useEffect, useRef } from 'react'
import { accountToFollow } from '@lpp/shared'
import { useAuth } from '@/lib/auth-context'
import { useInvalidateLinkedAccounts, useLinkedAccount, useLinkedAccounts } from '@/hooks/useLinkedAccount'
import { setActiveAccount } from '@/lib/account'
import { useLiveFeed } from '@/lib/live-feed-context'
import { supabase } from '@/lib/supabase'

/**
 * Follow the account League is signed in with (owner, 2026-10-28): when the desktop's
 * phase message names a linked Riot ID that is not the active account, make it active —
 * Matches, Performance, Prepare and the post-game then look at the right games without a tap.
 * An unlinked Riot ID is left to the Live screen to mention.
 */
export function useFollowLeagueAccount(): void {
  const { user } = useAuth()
  const { phase } = useLiveFeed()
  const { data: active } = useLinkedAccount()
  const { data: accounts } = useLinkedAccounts()
  const invalidate = useInvalidateLinkedAccounts()
  const switching = useRef<string | null>(null)
  const who = phase?.who ?? null
  useEffect(() => {
    if (!user || !accounts || active === undefined) return
    const d = accountToFollow(who, accounts, active?.puuid ?? null)
    if (d?.kind !== 'switch' || switching.current === d.puuid) return
    switching.current = d.puuid
    setActiveAccount(supabase, user.id, d.puuid)
      .then(() => invalidate())
      .catch(() => undefined) // offline: the next phase message tries again
      .finally(() => {
        switching.current = null
      })
  }, [who, accounts, active, user, invalidate])
}
