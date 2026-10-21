import type { ReactNode } from 'react'
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import logo from '../../assets/logo.png'
import { Disclaimer } from './Disclaimer'
import { colors, font, space } from '@/theme/tokens'

export function Wordmark() {
  return (
    <View style={styles.wordmarkBlock}>
      <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="LanePulse" />
      <Text style={styles.wordmark}>
        Lane<Text style={styles.wordmarkAccent}>Pulse</Text>
      </Text>
      <Text style={styles.tagline}>Personal performance coach</Text>
    </View>
  )
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.bgGradientTop, colors.bg, '#07061A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Wordmark />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={styles.form}>{children}</View>
            <View style={styles.footer}>
              <Disclaimer />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: space.md, paddingTop: space.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  wordmarkBlock: { alignItems: 'center', gap: 6, marginBottom: space.lg },
  logo: { width: 96, height: 96, marginBottom: 2 },
  wordmark: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  wordmarkAccent: { color: colors.accent },
  tagline: { color: colors.muted, fontSize: font.caption + 1, letterSpacing: 1 },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: font.body, textAlign: 'center', marginTop: 4, marginBottom: space.lg },
  form: { gap: space.sm + 4 },
  footer: { marginTop: 'auto', paddingVertical: space.md },
})
