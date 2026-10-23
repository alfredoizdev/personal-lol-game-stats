import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Screen } from '@/components/Screen'
import { AccountCard } from '@/components/AccountCard'
import { useLinkedAccount, useLinkedAccounts, useInvalidateLinkedAccounts } from '@/hooks/useLinkedAccount'
import { useAuth } from '@/lib/auth-context'
import { deleteAccount, setActiveAccount } from '@/lib/account'
import { revokePushToken } from '@/lib/push-notifications'
import { GoalPushSettings } from '@/components/GoalPushSettings'
import { supabase } from '@/lib/supabase'
import { acceptedVersionLabel } from '@/lib/legal-ui'
import { colors, font, radius, space } from '@/theme/tokens'

export default function ProfileScreen() {
  const { user } = useAuth()
  const { data: active } = useLinkedAccount()
  const { data: accounts = [], isLoading } = useLinkedAccounts()
  const invalidate = useInvalidateLinkedAccounts()
  const [busy, setBusy] = useState<string | null>(null)
  const acceptedLegalVersion = acceptedVersionLabel(user?.user_metadata?.accepted_legal_version)

  async function switchTo(puuid: string) {
    if (!user || busy) return
    setBusy(puuid)
    try {
      await setActiveAccount(supabase, user.id, puuid)
      await invalidate()
    } catch (err) {
      Alert.alert('Could not switch account', err instanceof Error ? err.message : 'Try again.')
    } finally {
      setBusy(null)
    }
  }

  async function signOut() {
    if (user) await revokePushToken(supabase, user.id).catch(() => {})
    await supabase.auth.signOut()
    router.replace('/(auth)/sign-in')
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, your linked Riot accounts, your goals, your notification settings and your push tokens. Your Riot account itself is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'There is no undo.', [
              { text: 'Keep my account', style: 'cancel' },
              { text: 'Delete everything', style: 'destructive', onPress: () => void runDelete() },
            ]),
        },
      ],
    )
  }

  async function runDelete() {
    const result = await deleteAccount(supabase)
    if (!result.ok) {
      Alert.alert('Could not delete', result.message)
      return
    }
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    router.replace('/(auth)/sign-in')
  }

  return (
    <Screen title="Profile" subtitle={user?.email ?? ''}>
      <Text style={styles.sectionTitle}>Riot accounts</Text>
      {isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
      {accounts.map((a) => (
        <AccountCard
          key={a.puuid}
          account={a}
          active={a.puuid === active?.puuid}
          onPress={a.puuid === active?.puuid ? undefined : () => void switchTo(a.puuid)}
        />
      ))}
      <Pressable style={styles.secondaryButton} onPress={() => router.push('/(app)/link')} accessibilityRole="button">
        <Text style={styles.secondaryText}>Add another Riot account</Text>
      </Pressable>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Notifications</Text>
      <GoalPushSettings />

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Legal</Text>
      <Pressable style={styles.secondaryButton} onPress={() => router.push('/legal/terms')} accessibilityRole="link">
        <Text style={styles.secondaryText}>Terms of Service</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => router.push('/legal/privacy')} accessibilityRole="link">
        <Text style={styles.secondaryText}>Privacy Policy</Text>
      </Pressable>
      <Text style={styles.muted}>Accepted version {acceptedLegalVersion}</Text>

      <View style={styles.divider} />

      <Pressable style={styles.secondaryButton} onPress={() => void signOut()} accessibilityRole="button">
        <Text style={styles.secondaryText}>Sign out</Text>
      </Pressable>
      <Pressable style={styles.dangerButton} onPress={confirmDelete} accessibilityRole="button">
        <Text style={styles.dangerText}>Delete account and data</Text>
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.muted, fontSize: font.caption, textTransform: 'uppercase', letterSpacing: 0.6 },
  muted: { color: colors.muted, fontSize: font.body },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.sm },
  secondaryButton: {
    borderRadius: radius.control,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  dangerButton: { borderRadius: radius.control, paddingVertical: 14, alignItems: 'center' },
  dangerText: { color: colors.loss, fontSize: font.body, fontWeight: '600' },
})
