import { Redirect, Tabs, useSegments } from 'expo-router'
import { Text } from 'react-native'
import { useAuth } from '@/lib/auth-context'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { resolveAppGroupRedirect } from '@/lib/route-guard'
import { colors } from '@/theme/tokens'

function TabLabel({ title, focused }: { title: string; focused: boolean }) {
  return <Text style={{ color: focused ? colors.text : colors.muted, fontSize: 13, fontWeight: '600' }}>{title}</Text>
}

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
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarShowLabel: true,
        tabBarIconStyle: { display: 'none' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="matches"
        options={{ title: 'Matches', tabBarLabel: ({ focused }) => <TabLabel title="Matches" focused={focused} /> }}
      />
      <Tabs.Screen
        name="live"
        options={{ title: 'Live', tabBarLabel: ({ focused }) => <TabLabel title="Live" focused={focused} /> }}
      />
      <Tabs.Screen name="link" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  )
}
