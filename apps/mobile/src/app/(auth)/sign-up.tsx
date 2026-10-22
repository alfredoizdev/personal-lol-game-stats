import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { LEGAL_VERSION, type Region } from '@lpp/shared'
import { AuthShell } from '@/components/AuthShell'
import { Field } from '@/components/Field'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Checkbox } from '@/components/Checkbox'
import { RegionPicker } from '@/components/RegionPicker'
import { supabase } from '@/lib/supabase'
import { validateSignUp, type SignUpField } from '@/lib/sign-up-form'
import { colors, font, space } from '@/theme/tokens'

export default function SignUpScreen() {
  const [username, setUsername] = useState('')
  const [riotId, setRiotId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [region, setRegion] = useState<Region>('NA')
  const [terms, setTerms] = useState(false)
  const [fieldError, setFieldError] = useState<{ field: SignUpField; message: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const errorFor = (f: SignUpField) => (fieldError?.field === f ? fieldError.message : null)

  async function create() {
    if (busy) return
    setFieldError(null)
    setNotice(null)
    const v = validateSignUp({ username, riotId, email, password, confirm, region, acceptedTerms: terms })
    if (!v.ok) {
      setFieldError({ field: v.field, message: v.message })
      return
    }
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: v.value.email,
      password: v.value.password,
      options: {
        data: {
          display_name: v.value.username,
          pending_riot_game_name: v.value.riotId?.gameName ?? null,
          pending_riot_tag_line: v.value.riotId?.tagLine ?? null,
          pending_region: v.value.region,
          accepted_legal_version: LEGAL_VERSION,
        },
      },
    })
    setBusy(false)
    if (error) {
      setFieldError({ field: 'email', message: error.message })
      return
    }
    if (!data.session) {
      setNotice('Check your email to confirm your account, then sign in.')
      return
    }
    router.replace('/')
  }

  return (
    <AuthShell title="Create your account" subtitle="Set up your profile and start tracking your games.">
      <Field label="Username" placeholder="Choose a unique username" value={username} onChangeText={setUsername} autoCapitalize="none" error={errorFor('username')} />
      <Field label="Riot ID" placeholder="GameName#TAG (e.g. Faker#KR1)" value={riotId} onChangeText={setRiotId} autoCapitalize="none" autoCorrect={false} error={errorFor('riotId')} />
      <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errorFor('email')} />
      <Field label="Password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secure textContentType="newPassword" error={errorFor('password')} />
      <Field label="Confirm Password" placeholder="Re-enter your password" value={confirm} onChangeText={setConfirm} secure textContentType="newPassword" error={errorFor('confirm')} />
      <View style={styles.regionBlock}>
        <Text style={styles.label}>Region</Text>
        <RegionPicker value={region} onChange={setRegion} />
      </View>
      <Checkbox checked={terms} onChange={setTerms}>
        I agree to the{' '}
        <Link href="/legal/terms" push style={styles.inlineLink} accessibilityRole="link">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/legal/privacy" push style={styles.inlineLink} accessibilityRole="link">
          Privacy Policy
        </Link>
      </Checkbox>
      {errorFor('terms') ? <Text style={styles.error}>{errorFor('terms')}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <PrimaryButton label="Create Account" onPress={() => void create()} busy={busy} />
      <View style={styles.footerRow}>
        <Text style={styles.muted}>Already have an account? </Text>
        <Link href="/(auth)/sign-in" style={styles.link}>
          Sign In
        </Link>
      </View>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  regionBlock: { gap: space.sm },
  label: { color: colors.text, fontSize: font.caption + 1, fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  link: { color: colors.accent, fontSize: font.caption + 2, fontWeight: '700', textDecorationLine: 'underline' },
  inlineLink: { color: colors.accent, fontWeight: '700', textDecorationLine: 'underline' },
  muted: { color: colors.muted, fontSize: font.caption + 2 },
  error: { color: colors.loss, fontSize: font.caption + 1 },
  notice: { color: colors.win, fontSize: font.caption + 2 },
})
