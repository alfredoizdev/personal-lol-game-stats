import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { RoleGoalRow, StoredGoal } from '@lpp/shared'
import { useAuth } from '@/lib/auth-context'
import { fetchGoals, saveGoalRows } from '@/lib/goals'
import type { LinkedAccount } from '@/lib/linked-account'
import { matchKeys } from '@/lib/match-keys'
import { supabase } from '@/lib/supabase'

/** The signed-in user's goals for the active Riot account, newest first, plus a save that appends the standing row and one row per role. */
export function useGoals(account: LinkedAccount | null): { goals: StoredGoal[]; loading: boolean; save: (g: Omit<StoredGoal, 'setAt' | 'puuid'>, rows: RoleGoalRow[]) => Promise<void>; saving: boolean } {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const q = useQuery({
    queryKey: matchKeys.goals(account?.puuid),
    queryFn: () => fetchGoals(supabase, user!.id, account!.puuid),
    enabled: !!user && !!account,
    staleTime: 5 * 60 * 1000,
  })
  const save = async (g: Omit<StoredGoal, 'setAt' | 'puuid'>, rows: RoleGoalRow[]) => {
    if (!user || !account) return
    setSaving(true)
    try {
      await saveGoalRows(supabase, user.id, [{ ...g, puuid: account.puuid }, ...rows.map((r) => ({ ...r, puuid: account.puuid }))])
      await qc.invalidateQueries({ queryKey: matchKeys.goals(account.puuid) })
    } finally {
      setSaving(false)
    }
  }
  return { goals: q.data ?? [], loading: !!account && q.isPending, save, saving }
}
