import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isPushSupported } from './push-support'
import { routeForNotification } from './push-routing'

/** Android channel the desktop targets (`channelId: 'goals'`). */
export const GOALS_CHANNEL_ID = 'goals'

export function pushSupported(): boolean {
  return isPushSupported({ executionEnvironment: Constants.executionEnvironment ?? undefined, isDevice: Device.isDevice })
}

/** Loaded lazily so Expo Go never evaluates the native module paths it does not have. */
async function notifications() {
  return import('expo-notifications')
}

let lastToken: string | null = null

/**
 * Asks permission, fetches the Expo push token and upserts it into
 * lanepulse_push_tokens for this user. No-op where push is unsupported or
 * permission is denied. Never throws.
 */
export async function registerPushToken(client: SupabaseClient, userId: string): Promise<'registered' | 'unsupported' | 'denied' | 'failed'> {
  if (!pushSupported()) return 'unsupported'
  try {
    const N = await notifications()
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(GOALS_CHANNEL_ID, { name: 'Goal updates', importance: N.AndroidImportance.HIGH })
    }
    const existing = await N.getPermissionsAsync()
    const status = existing.granted ? existing.status : (await N.requestPermissionsAsync()).status
    if (status !== 'granted') return 'denied'
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
    const { data: token } = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    const { error } = await client.from('lanepulse_push_tokens').upsert(
      {
        user_id: userId,
        expo_token: token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        app_version: Constants.expoConfig?.version ?? null,
        last_seen_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: 'user_id,expo_token' },
    )
    if (error) throw new Error(error.message)
    lastToken = token
    return 'registered'
  } catch {
    return 'failed'
  }
}

/** Marks this device's token revoked (sign-out): the desktop stops sending to it. */
export async function revokePushToken(client: SupabaseClient, userId: string): Promise<void> {
  if (!lastToken) return
  await client.from('lanepulse_push_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId).eq('expo_token', lastToken)
  lastToken = null
}

/**
 * Routes notification taps (foreground, background and the one that cold-started
 * the app). Returns an unsubscribe function; a no-op where push is unsupported.
 */
export async function listenForNotificationTaps(navigate: (route: string) => void): Promise<() => void> {
  if (!pushSupported()) return () => {}
  try {
    const N = await notifications()
    N.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    })
    const open = (data: unknown) => {
      const route = routeForNotification(data)
      if (route) navigate(route)
    }
    const sub = N.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data))
    const last = await N.getLastNotificationResponseAsync()
    if (last) open(last.notification.request.content.data)
    return () => sub.remove()
  } catch {
    return () => {}
  }
}
