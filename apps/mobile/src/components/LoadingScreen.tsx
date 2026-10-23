import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors, font, space } from '@/theme/tokens'

/** The launch screen while your games load (once per account, then instant). */
export function LoadingScreen({ loaded, total, idsPending }: { loaded: number; total: number; idsPending: boolean }) {
  const pct = total ? Math.round((loaded / total) * 100) : 0
  return (
    <View style={styles.center}>
      <Text style={styles.brand} maxFontSizeMultiplier={1.15}>LanePulse</Text>
      <ActivityIndicator color={colors.muted} />
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Loading your games</Text>
      <Text style={styles.muted} maxFontSizeMultiplier={1.15}>{idsPending || !total ? 'Finding your recent games…' : `${loaded} of your last ${total} games ready · cached after the first time`}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.lg },
  brand: { color: colors.text, fontSize: font.body + 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: space.sm },
  title: { color: colors.text, fontSize: font.body + 3, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: font.body, textAlign: 'center' },
  track: { width: 220, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
})
