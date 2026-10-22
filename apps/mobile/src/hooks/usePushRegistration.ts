import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { listenForNotificationTaps, registerPushToken, revokePushToken } from '@/lib/push-notifications'
import { pushRegistrationAction } from '@/lib/push-registration'
import { supabase } from '@/lib/supabase'
import { useNotificationPrefs } from './useNotificationPrefs'

/**
 * Registers this device for goal pushes only while the signed-in user has the
 * toggle on (revokes when it goes off), and routes notification taps.
 */
export function usePushRegistration(): void {
  const { user } = useAuth()
  const { prefs, loading } = useNotificationPrefs()
  const registered = useRef<boolean | null>(null)

  useEffect(() => {
    registered.current = null // another account (or none): this device's state is unknown again
  }, [user?.id])

  useEffect(() => {
    const action = pushRegistrationAction(registered.current, { signedIn: !!user, goalPush: loading ? null : prefs.goalPush })
    if (!action || !user) return
    if (action === 'register') {
      registered.current = true
      void registerPushToken(supabase, user.id).then((r) => {
        if (r !== 'registered') registered.current = false
      })
    } else {
      registered.current = false
      void revokePushToken(supabase, user.id).catch(() => {})
    }
  }, [user, loading, prefs.goalPush])

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
