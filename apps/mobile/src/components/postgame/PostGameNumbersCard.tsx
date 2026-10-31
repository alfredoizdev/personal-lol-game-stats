import { StyleSheet, Text, View } from 'react-native'
import type { PostGameNumber } from '@lpp/shared'
import { colors, font, radius, space } from '@/theme/tokens'

const VERDICT_COLOR = { above: colors.win, even: colors.text, below: colors.loss } as const

/**
 * Your numbers on the "Match ended" screen (owner, 2026-10-31: the stats you did
 * well, not only the goal): one row per scored metric, your value green when it
 * beats the typical value for your tier, red when it trails it. From the final
 * live snapshot, so it shows at once; the score and the damage come with the
 * review once Riot lists the game.
 */
export function PostGameNumbersCard({ rows, tier, ranked }: { rows: PostGameNumber[]; tier: string; ranked: boolean }) {
  if (rows.length === 0) return null
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>Your numbers</Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.15}>{ranked ? `vs typical ${tier}` : `vs typical ${tier} · unranked`}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={r.metric} style={[styles.row, i > 0 && styles.rowBorder]}>
          <Text style={styles.label} maxFontSizeMultiplier={1.15}>{r.label}</Text>
          <Text style={[styles.value, { color: VERDICT_COLOR[r.verdict] }]} maxFontSizeMultiplier={1.15}>{r.value}</Text>
          <Text style={styles.typical} maxFontSizeMultiplier={1.15}>typical {r.typical}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, paddingHorizontal: space.md, paddingVertical: space.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: space.sm },
  title: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  label: { flex: 1, color: colors.text, fontSize: font.body },
  value: { fontSize: font.body + 1, fontWeight: '800', minWidth: 48, textAlign: 'right' },
  typical: { color: colors.muted, fontSize: font.caption, minWidth: 92, textAlign: 'right' },
})
