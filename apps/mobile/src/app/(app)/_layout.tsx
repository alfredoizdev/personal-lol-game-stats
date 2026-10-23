import { Redirect, Stack, useSegments } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { resolveAppGroupRedirect } from '@/lib/route-guard'
import { usePushRegistration } from '@/hooks/usePushRegistration'
import { LiveFeedProvider } from '@/lib/live-feed-context'
import { colors } from '@/theme/tokens'

export default function AppLayout() {
  const { user, loading } = useAuth()
  const { data } = useLinkedAccount()
  const segments = useSegments() as string[]
  usePushRegistration()
  const redirect = resolveAppGroupRedirect({
    loading,
    signedIn: !!user,
    linked: data === undefined ? null : data !== null,
    segment: segments[1],
  })
  if (loading) return null
  if (redirect) return <Redirect href={redirect} />

  return (
    <LiveFeedProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="link" />
      </Stack>
    </LiveFeedProvider>
  )
}
