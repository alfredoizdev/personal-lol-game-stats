import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { parseRiotId, type Region } from '@lpp/shared'
import { Screen } from '@/components/Screen'
import { RegionPicker } from '@/components/RegionPicker'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
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
  const { refetch } = useLinkedAccount()
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
    await refetch()
    router.replace('/(app)/matches')
  }

  return (
    <Screen title="Your Riot ID">
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
        {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>Link account</Text>}
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
  button: { backgroundColor: colors.text, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.bg, fontSize: font.body, fontWeight: '600' },
})
