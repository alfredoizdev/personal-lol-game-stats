import { Pressable, StyleSheet, Text } from 'react-native'
import { router } from 'expo-router'
import { Screen } from '@/components/Screen'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/theme/tokens'

export default function MatchesScreen() {
  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/sign-in')
  }
  return (
    <Screen
      title="Matches"
      right={
        <Pressable onPress={() => void signOut()} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      }
    >
      <Text style={styles.muted}>Your recent matches will appear here.</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: font.body },
  link: { color: colors.muted, fontSize: font.caption + 2, fontWeight: '600' },
})
