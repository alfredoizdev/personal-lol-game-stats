import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { fetchLinkedAccount, fetchLinkedAccounts } from '@/lib/linked-account'
import { supabase } from '@/lib/supabase'

export const linkedAccountKeys = {
  active: (userId: string | undefined) => ['linked-account', userId] as const,
  all: (userId: string | undefined) => ['linked-accounts', userId] as const,
}

/** The active linked account (null when none). */
export function useLinkedAccount() {
  const { user } = useAuth()
  return useQuery({
    queryKey: linkedAccountKeys.active(user?.id),
    queryFn: () => fetchLinkedAccount(supabase, user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}

/** Every linked account, most recently used first. */
export function useLinkedAccounts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: linkedAccountKeys.all(user?.id),
    queryFn: () => fetchLinkedAccounts(supabase, user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}

/** Invalidate both account queries after linking or switching. */
export function useInvalidateLinkedAccounts() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: linkedAccountKeys.active(user?.id) }),
      qc.invalidateQueries({ queryKey: linkedAccountKeys.all(user?.id) }),
    ])
}
