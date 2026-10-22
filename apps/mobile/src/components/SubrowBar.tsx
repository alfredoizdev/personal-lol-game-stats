import { StyleSheet, Text, View } from 'react-native'
import { rating, type Subrow } from '@lpp/shared'
import { barFraction, deltaLabel, ratingColor, unitFor } from '@/lib/area-ui'
import { colors, font } from '@/theme/tokens'

/** One explained metric: label, value, score bar, and the "vs opponent" / "vs you" deltas underneath. */
export function SubrowBar({ subrow, baselineN }: { subrow: Subrow; baselineN: number }) {
  const unit = unitFor(subrow.key)
  const deltas = [deltaLabel(subrow.delta.vsOpponent, unit, 'opponent'), deltaLabel(subrow.delta.vsYou, unit, 'you', baselineN)].filter(
    (d): d is string => d !== null,
  )
  const color = subrow.score === null ? colors.muted : ratingColor(rating(subrow.score))
  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <Text style={styles.label}>{subrow.label}</Text>
        <Text style={[styles.value, subrow.context && styles.valueMuted]}>{subrow.display}</Text>
      </View>
      {subrow.context ? null : (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(barFraction(subrow) * 100)}%`, backgroundColor: color }]} />
        </View>
      )}
      {deltas.length ? <Text style={styles.deltas}>{deltas.join('  ·  ')}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { gap: 5, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { color: colors.text, fontSize: font.body - 1, fontWeight: '600', flexShrink: 1 },
  value: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  valueMuted: { color: colors.muted, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  deltas: { color: colors.muted, fontSize: font.caption },
})
