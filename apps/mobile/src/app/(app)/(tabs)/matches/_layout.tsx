import { Stack } from 'expo-router'
import { colors } from '@/theme/tokens'

/** Matches list → Match Review, with the tab bar staying visible and Matches highlighted. */
export default function MatchesStackLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
