import { Redirect, Stack, useSegments } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { resolveAppGroupRedirect } from '@/lib/route-guard'
import { colors } from '@/theme/tokens'

export default function AppLayout() {
  const { user, loading } = useAuth()
  const { data } = useLinkedAccount()
  const segments = useSegments() as string[]
  const redirect = resolveAppGroupRedirect({
    loading,
    signedIn: !!user,
    linked: data === undefined ? null : data !== null,
    segment: segments[1],
  })
  if (loading) return null
  if (redirect) return <Redirect href={redirect} />

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="link" />
    </Stack>
  )
}
