import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSegments } from 'expo-router'
import { colors, font } from '@/theme/tokens'
import { activeTabFor, tabBarHiddenFor } from '@/lib/tab-bar'

const TABS: Record<string, { label: string; icon: (color: string) => React.ReactNode }> = {
  matches: { label: 'Matches', icon: (c) => <MaterialCommunityIcons name="sword-cross" size={24} color={c} /> },
  live: { label: 'Live', icon: (c) => <Ionicons name="radio-outline" size={24} color={c} /> },
  performance: { label: 'Performance', icon: (c) => <Ionicons name="stats-chart-outline" size={24} color={c} /> },
  profile: { label: 'Profile', icon: (c) => <Ionicons name="person-outline" size={24} color={c} /> },
}

/** Icons + labels centered, active tab in accent with a short underline (mockups 06–08). Bottom inset handles the Android nav bar. */
/** Shape expo-router 58 passes to the `tabBar` prop of <Tabs>. */
type TabBarProps = {
  state: { index: number; routes: Array<{ key: string; name: string; state?: { index: number } }> }
  navigateToTab: (routeKey: string) => void
  insets: { bottom: number }
}

export function TabBar({ state, navigateToTab, insets }: TabBarProps) {
  const segments = useSegments() as string[]
  const focusedRoute = state.routes[state.index] ?? { key: 'matches', name: 'matches' }
  const focusedName = focusedRoute.name
  if (tabBarHiddenFor({ ...focusedRoute, segments })) return null
  const active = activeTabFor(focusedName)
  const visible = state.routes.filter((r) => TABS[r.name])
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {visible.map((route) => {
        const tab = TABS[route.name]!
        const focused = route.name === active
        const color = focused ? colors.accent : colors.muted
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (!focused) navigateToTab(route.key)
            }}
            style={styles.item}
          >
            {tab.icon(color)}
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
            <View style={[styles.underline, focused && styles.underlineActive]} />
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: font.caption, fontWeight: '600' },
  underline: { width: 28, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginTop: 2 },
  underlineActive: { backgroundColor: colors.accent },
})
