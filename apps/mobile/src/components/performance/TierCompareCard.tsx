import { StyleSheet, Text, View } from 'react-native'
import { ROLE_LABEL, weakestRow, type CompareRow, type RankTier, type Role } from '@lpp/shared'
import { compareValues, deltaChip } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/**
 * "You vs Gold" (owner, 2026-10-27: "tampoco hay comparativas"): your averages in your main role
 * next to the typical value for your Solo/Duo tier — two bars per metric and the signed gap.
 * The tier values are community estimates, said once at the bottom.
 */
export function TierCompareCard({ rows, tier, ranked, role, games }: { rows: CompareRow[]; tier: RankTier; ranked: boolean; role: Role; games: number }) {
  const weakest = weakestRow(rows)
  const title = ranked ? `You vs ${tier}` : `You vs ${tier} (unranked)`
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>{title}</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>As {ROLE_LABEL[role]} · {games} game{games === 1 ? '' : 's'}</Text>
      {rows.map((r) => {
        const v = compareValues(r)
        const chip = deltaChip(r)
        const max = Math.max(r.you ?? 0, r.bench) * 1.1 || 1
        const youW = r.you === null ? 0 : Math.round((r.you / max) * 100)
        const benchW = Math.round((r.bench / max) * 100)
        return (
          <View key={r.metric} style={styles.row} accessibilityLabel={`${r.label}: you ${v.you}, ${tier} ${v.bench}`}>
            <View style={styles.rowHead}>
              <Text style={styles.label} maxFontSizeMultiplier={1.15}>
                {r.label}
                {r.metric === weakest ? <Text style={styles.weak}>  weakest</Text> : null}
              </Text>
              <View style={styles.values}>
                <Text style={styles.you} maxFontSizeMultiplier={1.15}>{v.you}</Text>
                <Text style={styles.vs} maxFontSizeMultiplier={1.15}> vs {v.bench}</Text>
                {chip ? <Text style={[styles.chip, { color: chip.color }]} maxFontSizeMultiplier={1.15}>{chip.text}</Text> : null}
              </View>
            </View>
            <View style={styles.bars}>
              <View style={styles.track}><View style={[styles.fill, styles.fillYou, { width: `${youW}%` }]} /></View>
              <View style={styles.track}><View style={[styles.fill, styles.fillBench, { width: `${benchW}%` }]} /></View>
            </View>
          </View>
        )
      })}
      <View style={styles.legend}>
        <View style={[styles.dot, styles.fillYou]} /><Text style={styles.legendText} maxFontSizeMultiplier={1.15}>You</Text>
        <View style={[styles.dot, styles.fillBench]} /><Text style={styles.legendText} maxFontSizeMultiplier={1.15}>Typical {tier} · community estimate, not Riot data</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption, marginTop: -4 },
  row: { gap: 5, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  label: { color: colors.text, fontSize: font.body - 1, fontWeight: '700' },
  weak: { color: colors.loss, fontSize: font.caption - 2, fontWeight: '800' },
  values: { flexDirection: 'row', alignItems: 'baseline' },
  you: { color: colors.text, fontSize: font.body - 1, fontWeight: '800' },
  vs: { color: colors.muted, fontSize: font.caption },
  chip: { fontSize: font.caption, fontWeight: '800', marginLeft: 8 },
  bars: { gap: 3 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  fillYou: { backgroundColor: colors.you },
  fillBench: { backgroundColor: colors.muted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.muted, fontSize: font.caption - 2, marginRight: 6, flexShrink: 1 },
})
