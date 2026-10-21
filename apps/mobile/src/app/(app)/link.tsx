import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { parseRiotId, type Region } from '@lpp/shared'
import { Screen } from '@/components/Screen'
import { RegionPicker } from '@/components/RegionPicker'
import { useLinkedAccount, useInvalidateLinkedAccounts } from '@/hooks/useLinkedAccount'
import { useAuth } from '@/lib/auth-context'
import { setActiveAccount } from '@/lib/account'
import { linkRiotAccount, type LinkErrorCode } from '@/lib/linked-account'
import { supabase } from '@/lib/supabase'
import { colors, font, space } from '@/theme/tokens'

function errorMessage(code: LinkErrorCode, region: Region): string {
  switch (code) {
    case 'NOT_FOUND':
      return `That Riot ID was not found in ${region}`
    case 'RATE_LIMITED':
      return 'Riot is busy, try again in a minute'
    case 'IDENTITY_MISSING':
      return 'Enter your Riot ID as Name#TAG'
    case 'UNKNOWN':
      return 'Could not link, try again'
  }
}

export default function LinkScreen() {
  const { user } = useAuth()
  const { data: existing } = useLinkedAccount()
  const invalidate = useInvalidateLinkedAccounts()
  const [riotId, setRiotId] = useState('')
  const [region, setRegion] = useState<Region>('NA')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (busy) return
    const parsed = parseRiotId(riotId)
    if (!parsed) {
      setMessage('Enter your Riot ID as Name#TAG')
      return
    }
    setBusy(true)
    setMessage(null)
    const result = await linkRiotAccount(supabase, { ...parsed, region })
    setBusy(false)
    if (!result.ok) {
      setMessage(errorMessage(result.code, region))
      return
    }
    if (user) await setActiveAccount(supabase, user.id, result.puuid).catch(() => {})
    await invalidate()
    router.replace(existing ? '/(app)/profile' : '/(app)/matches')
  }

  return (
    <Screen
      title={existing ? 'Add Riot account' : 'Your Riot ID'}
      right={
        existing ? (
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.muted}>Cancel</Text>
          </Pressable>
        ) : undefined
      }
    >
      <Text style={styles.muted}>We use it to read your own match history. Nothing else.</Text>
      <TextInput
        style={styles.input}
        value={riotId}
        onChangeText={setRiotId}
        placeholder="Riot ID (Name#TAG)"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.regionBlock}>
        <Text style={styles.label}>Region</Text>
        <RegionPicker value={region} onChange={setRegion} />
      </View>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => void submit()}
        disabled={busy}
        accessibilityRole="button"
      >
        {busy ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Link account</Text>}
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: font.body },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text,
    fontSize: font.body,
  },
  regionBlock: { gap: space.sm },
  label: { color: colors.muted, fontSize: font.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  error: { color: colors.loss, fontSize: font.caption + 2 },
  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.text, fontSize: font.body, fontWeight: '700' },
})
