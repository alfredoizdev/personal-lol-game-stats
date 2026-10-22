import { useEffect } from 'react'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { listenForNotificationTaps, registerPushToken } from '@/lib/push-notifications'
import { supabase } from '@/lib/supabase'

/** Registers this device for goal pushes while signed in and routes notification taps. */
export function usePushRegistration(): void {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    void registerPushToken(supabase, user.id)
  }, [user])

  useEffect(() => {
    let off: (() => void) | null = null
    let alive = true
    void listenForNotificationTaps((route) => router.navigate(route as never)).then((unsub) => {
      if (alive) off = unsub
      else unsub()
    })
    return () => {
      alive = false
      off?.()
    }
  }, [])
}
