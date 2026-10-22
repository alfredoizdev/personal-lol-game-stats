import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { DEFAULT_PREFS, fetchPrefs, savePrefs, type NotificationPrefs } from '@/lib/notification-prefs'
import { supabase } from '@/lib/supabase'

export const notificationPrefsKey = (userId: string | undefined) => ['notification-prefs', userId] as const

export function useNotificationPrefs() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const key = notificationPrefsKey(user?.id)
  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchPrefs(supabase, user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  })
  const save = useMutation({
    mutationFn: (p: NotificationPrefs) => savePrefs(supabase, user!.id, p),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<NotificationPrefs>(key)
      qc.setQueryData(key, p)
      return { previous }
    },
    onError: (_err, _p, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  })
  return { prefs: query.data ?? DEFAULT_PREFS, loading: query.isLoading, error: save.error ?? query.error, save: save.mutate }
}
