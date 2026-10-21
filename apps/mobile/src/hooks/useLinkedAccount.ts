import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { fetchLinkedAccount } from '@/lib/linked-account'
import { supabase } from '@/lib/supabase'

export function useLinkedAccount() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['linked-account', user?.id],
    queryFn: () => fetchLinkedAccount(supabase, user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}
