import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { colors } from '@/theme/tokens'

function TabLabel({ title, focused }: { title: string; focused: boolean }) {
  return <Text style={{ color: focused ? colors.text : colors.muted, fontSize: 13, fontWeight: '600' }}>{title}</Text>
}

export default function AppLayout() {
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
      <Tabs.Screen name="link" options={{ href: null }} />
    </Tabs>
  )
}
