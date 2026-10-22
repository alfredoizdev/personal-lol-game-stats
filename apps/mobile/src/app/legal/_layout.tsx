import { Stack } from 'expo-router'
import { colors } from '@/theme/tokens'

/** Legal screens live outside the auth and app groups so they open before sign-in and keep the sign-up form mounted. */
export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerBackTitle: 'Back',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="terms" options={{ title: 'Terms of Service' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
    </Stack>
  )
}
