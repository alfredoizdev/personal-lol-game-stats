import { StyleSheet, Text, View } from 'react-native'
import { phaseView, type LivePhasePayload } from '@lpp/shared'
import { colors, font, radius, space } from '@/theme/tokens'

/** What the League client is doing before a game: lobby, queue (with its timer), ready check, champion select, loading. */
export function PhaseCard({ phase, receivedAt, now, connected }: { phase: LivePhasePayload | null; receivedAt: number; now: number; connected: boolean }) {
  const view = phaseView(phase, receivedAt, now)
  const waiting = view.label === 'Waiting for a match'
  const live = !waiting
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: live ? colors.accent : colors.border }]} />
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>{view.label}</Text>
        {view.timer ? <Text style={styles.timer} maxFontSizeMultiplier={1.15}>{view.timer}</Text> : null}
      </View>
      {waiting ? <Text style={styles.muted} maxFontSizeMultiplier={1.15}>Keep the LanePulse collector open on your Mac. Your stats appear here as soon as a game starts.</Text> : null}
      {waiting && !connected ? <Text style={styles.warn} maxFontSizeMultiplier={1.15}>Not connected to live updates yet…</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800', flex: 1 },
  timer: { color: colors.text, fontSize: font.body + 4, fontWeight: '800', fontVariant: ['tabular-nums'] },
  muted: { color: colors.muted, fontSize: font.body },
  warn: { color: colors.warn, fontSize: font.caption + 1 },
})
