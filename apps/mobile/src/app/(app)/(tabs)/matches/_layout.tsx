import { Stack } from 'expo-router'
import { colors } from '@/theme/tokens'

/** Matches list → Match Review. The tab bar hides on the pushed screens (the chevron is the way back). */
export default function MatchesStackLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
