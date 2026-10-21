import { Redirect, router } from 'expo-router'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/lib/auth-context'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { resolveEntryRoute } from '@/lib/route-guard'
import { supabase } from '@/lib/supabase'
import { colors, font, space } from '@/theme/tokens'

export default function Index() {
  const { user, loading } = useAuth()
  const { data, isError, refetch } = useLinkedAccount()
  const route = resolveEntryRoute({
    loading,
    signedIn: !!user,
    linked: data === undefined ? null : data !== null,
    linkError: isError,
  })

  if (route === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn't load your account</Text>
        <Text style={styles.muted}>Check your connection and try again.</Text>
        <Pressable style={styles.button} onPress={() => void refetch()} accessibilityRole="button">
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
        <Pressable
          onPress={() => void supabase.auth.signOut().then(() => router.replace('/(auth)/sign-in'))}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      </View>
    )
  }
  if (!route) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.muted} />
      </View>
    )
  }
  return <Redirect href={route} />
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.md },
  title: { color: colors.text, fontSize: font.body + 3, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: font.body, textAlign: 'center' },
  button: { backgroundColor: colors.text, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: colors.bg, fontSize: font.body, fontWeight: '600' },
  link: { color: colors.muted, fontSize: font.caption + 2, fontWeight: '600' },
})
