import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link, type Href } from 'expo-router'
import { RIOT_DISCLAIMER } from '@lpp/shared'
import { colors, font, space } from '@/theme/tokens'

type Props = {
  title: string
  submitLabel: string
  onSubmit: (email: string, password: string) => Promise<string | null>
  footerText: string
  footerLinkLabel: string
  footerHref: Href
}

export function AuthForm({ title, submitLabel, onSubmit, footerText, footerLinkLabel, footerHref }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (busy) return
    setBusy(true)
    setMessage(null)
    const result = await onSubmit(email.trim(), password)
    setBusy(false)
    if (result) setMessage(result)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.screen}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            textContentType="password"
          />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => void submit()}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>{submitLabel}</Text>}
          </Pressable>
          <View style={styles.footer}>
            <Text style={styles.muted}>{footerText} </Text>
            <Link href={footerHref} style={styles.link}>
              {footerLinkLabel}
            </Link>
          </View>
          <Text style={styles.disclaimer}>{RIOT_DISCLAIMER}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: space.md, paddingTop: space.lg * 2, gap: space.md, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { color: colors.text, fontSize: font.title, fontWeight: '700' },
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
  message: { color: colors.loss, fontSize: font.caption + 2 },
  button: { backgroundColor: colors.text, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.bg, fontSize: font.body, fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center' },
  muted: { color: colors.muted, fontSize: font.caption + 2 },
  link: { color: colors.text, fontSize: font.caption + 2, fontWeight: '600' },
  disclaimer: { marginTop: 'auto', color: colors.muted, fontSize: font.caption - 2, lineHeight: 15, paddingBottom: space.md },
})
