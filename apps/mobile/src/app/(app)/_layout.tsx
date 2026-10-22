import { Redirect, Tabs, useSegments } from 'expo-router'
import { TabBar } from '@/components/TabBar'
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
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
      <Tabs.Screen name="live" options={{ title: 'Live' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="link" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="match/[matchId]" options={{ href: null }} />
    </Tabs>
  )
}
