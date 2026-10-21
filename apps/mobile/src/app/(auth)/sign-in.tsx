import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { AuthShell } from '@/components/AuthShell'
import { Field } from '@/components/Field'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Checkbox } from '@/components/Checkbox'
import { supabase } from '@/lib/supabase'
import { setRememberMe } from '@/lib/remember-me'
import { colors, font } from '@/theme/tokens'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function signIn() {
    if (busy) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setBusy(false)
    if (err) {
      setError(err.message)
      return
    }
    await setRememberMe(remember)
    router.replace('/')
  }

  async function forgotPassword() {
    const target = email.trim().toLowerCase()
    if (!target) {
      setError('Enter your email first, then tap "Forgot password?"')
      return
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(target)
    if (err) {
      setError(err.message)
      return
    }
    Alert.alert('Check your email', `We sent a password reset link to ${target}.`)
  }

  return (
    <AuthShell title="Welcome back" subtitle="Track your matches and improve your play.">
      <Field
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Field value={password} onChangeText={setPassword} placeholder="Password" secure textContentType="password" />
      <View style={styles.row}>
        <View style={styles.grow}>
          <Checkbox checked={remember} onChange={setRemember}>
            Remember me
          </Checkbox>
        </View>
        <Pressable onPress={() => void forgotPassword()} hitSlop={8} accessibilityRole="button" style={styles.noShrink}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Sign In" onPress={() => void signIn()} busy={busy} />
      <View style={styles.footerRow}>
        <Text style={styles.muted}>Don't have an account? </Text>
        <Link href="/(auth)/sign-up" style={styles.link}>
          Register
        </Link>
      </View>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  grow: { flex: 1 },
  noShrink: { flexShrink: 0 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  link: { color: colors.accent, fontSize: font.caption + 2, fontWeight: '700', textDecorationLine: 'underline' },
  muted: { color: colors.muted, fontSize: font.caption + 2 },
  error: { color: colors.loss, fontSize: font.caption + 1 },
})
