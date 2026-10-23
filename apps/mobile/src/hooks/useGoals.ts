import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { StoredGoal } from '@lpp/shared'
import { useAuth } from '@/lib/auth-context'
import { fetchGoals, saveGoal } from '@/lib/goals'
import type { LinkedAccount } from '@/lib/linked-account'
import { matchKeys } from '@/lib/match-keys'
import { supabase } from '@/lib/supabase'

/** The signed-in user's goals for the active Riot account, newest first, plus a save that appends a row. */
export function useGoals(account: LinkedAccount | null): { goals: StoredGoal[]; loading: boolean; save: (g: Omit<StoredGoal, 'setAt' | 'puuid'>) => Promise<void>; saving: boolean } {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const q = useQuery({
    queryKey: matchKeys.goals(account?.puuid),
    queryFn: () => fetchGoals(supabase, user!.id, account!.puuid),
    enabled: !!user && !!account,
    staleTime: 5 * 60 * 1000,
  })
  const save = async (g: Omit<StoredGoal, 'setAt' | 'puuid'>) => {
    if (!user || !account) return
    setSaving(true)
    try {
      await saveGoal(supabase, user.id, { ...g, puuid: account.puuid })
      await qc.invalidateQueries({ queryKey: matchKeys.goals(account.puuid) })
    } finally {
      setSaving(false)
    }
  }
  return { goals: q.data ?? [], loading: !!account && q.isPending, save, saving }
}
