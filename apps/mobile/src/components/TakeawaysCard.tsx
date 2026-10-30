import { StyleSheet, Text, View } from 'react-native'
import type { Takeaway } from '@lpp/shared'
import { colors, font, radius, space } from '@/theme/tokens'

const TONE = { good: colors.win, bad: colors.loss, plain: colors.muted }
const KICKER = { best: 'Best', worst: 'Work on', goal: 'Goal' }

/**
 * "¿Qué tal lo hice?" (owner, 2026-10-30, one question per screen): three lines at
 * most — your best number, your worst, the goal verdict — each with the comparison
 * the engine already had (rival, you, or the role target). No tables, no charts.
 */
export function TakeawaysCard({ items }: { items: Takeaway[] }) {
  if (items.length === 0) return null
  return (
    <View style={styles.card}>
      {items.map((t, i) => (
        <View key={t.kind} style={[styles.row, i > 0 && styles.rowBorder]} accessibilityLabel={`${KICKER[t.kind]}: ${t.label}, ${t.value}${t.compare ? `, ${t.compare}` : ''}`}>
          <View style={[styles.bar, { backgroundColor: TONE[t.tone] }]} />
          <View style={styles.body}>
            <Text style={[styles.kicker, { color: TONE[t.tone] }]} maxFontSizeMultiplier={1.15}>{KICKER[t.kind]}</Text>
            {t.kind === 'goal' ? (
              <Text style={styles.goal} maxFontSizeMultiplier={1.15}>{t.value}</Text>
            ) : (
              <View style={styles.line}>
                <Text style={styles.label} maxFontSizeMultiplier={1.15}>{t.label}</Text>
                <Text style={styles.value} maxFontSizeMultiplier={1.15}>
                  {t.value}
                  {t.compare ? <Text style={styles.compare}>  {t.compare}</Text> : null}
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, paddingHorizontal: space.md },
  row: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm + 2 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  bar: { width: 3, borderRadius: 2 },
  body: { flex: 1, gap: 2 },
  kicker: { fontSize: font.caption - 1, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  line: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  label: { color: colors.text, fontSize: font.body, fontWeight: '700', flexShrink: 1 },
  value: { color: colors.text, fontSize: font.body + 2, fontWeight: '800', fontVariant: ['tabular-nums'] },
  compare: { color: colors.muted, fontSize: font.caption + 1, fontWeight: '600' },
  goal: { color: colors.text, fontSize: font.body, fontWeight: '600' },
})
