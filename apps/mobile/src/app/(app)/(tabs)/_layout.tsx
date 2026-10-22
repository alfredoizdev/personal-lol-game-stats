import { Tabs } from 'expo-router'
import { TabBar } from '@/components/TabBar'
import { colors } from '@/theme/tokens'

/** The three main tabs. Match Review lives inside the Matches tab's own stack. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
      <Tabs.Screen name="live" options={{ title: 'Live' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
