import { StyleSheet, Text, View } from 'react-native'
import type { SessionPatterns } from '@lpp/shared'
import { afterLossLine, deepSessionLine, sessionSubtitle } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/**
 * "Your sessions" (owner, 2026-10-29): two comparisons from your own games — the next game
 * after a loss against after a win, and games 1–2 of a sitting against the 4th onwards — each
 * as two values side by side (the worse one red, the other green, both plain when the gap is
 * under 5 points; the sentence is the accessibility label). Rows without enough games
 * are left out; the screen hides the card when neither row has data.
 */
export function SessionsCard({ patterns }: { patterns: SessionPatterns }) {
  const after = afterLossLine(patterns)
  const deep = deepSessionLine(patterns)
  if (!after && !deep) return null
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Your sessions</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>{sessionSubtitle(patterns)}</Text>
      {after ? (
        <Row
          left={{ label: 'Next game after a loss', value: after.loss, bad: after.worse === 'loss' }}
          right={{ label: 'Next game after a win', value: after.win, bad: after.worse === 'win' }}
          text={after.text}
        />
      ) : null}
      {deep ? (
        <Row
          left={{ label: deep.earlyLabel, value: deep.early, bad: deep.worse === 'early' }}
          right={{ label: deep.deepLabel, value: deep.deep, bad: deep.worse === 'deep' }}
          text={deep.text}
        />
      ) : null}
    </View>
  )
}

type Side = { label: string; value: string; bad: boolean }
function Row({ left, right, text }: { left: Side; right: Side; text: string }) {
  return (
    <View style={styles.row} accessibilityLabel={text}>
      <View style={styles.sides}>
        {[left, right].map((s) => (
          <View key={s.label} style={styles.side}>
            <Text style={[styles.value, s.bad ? styles.bad : left.bad || right.bad ? styles.good : null]} maxFontSizeMultiplier={1.15}>{s.value}</Text>
            <Text style={styles.label} maxFontSizeMultiplier={1.15}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption, marginTop: -4 },
  row: { gap: 6, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  sides: { flexDirection: 'row', gap: space.sm },
  side: { flex: 1, gap: 2 },
  value: { color: colors.text, fontSize: font.body + 3, fontWeight: '800', fontVariant: ['tabular-nums'] },
  good: { color: colors.win },
  bad: { color: colors.loss },
  label: { color: colors.muted, fontSize: font.caption },
})
