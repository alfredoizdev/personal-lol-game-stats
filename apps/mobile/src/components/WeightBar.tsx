import { StyleSheet, Text, View } from 'react-native'
import { colors, font } from '@/theme/tokens'

/** Fixed categorical order, never cycled (dataviz rule); four steps is the ceiling we need. */
const SEGMENT_COLORS = ['#8B5CF6', '#0E9DB5', '#E8486F', '#F59E0B']

/** One stacked bar of weights (they sum to 100) with a labelled legend underneath. */
export function WeightBar({ title, segments }: { title: string; segments: Array<{ label: string; weight: number }> }) {
  const total = segments.reduce((s, x) => s + x.weight, 0) || 1
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.bar}>
        {segments.map((s, i) => (
          <View key={s.label} style={[styles.seg, { flex: s.weight / total, backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length], marginLeft: i ? 2 : 0 }]}>
            {s.weight / total >= 0.15 ? <Text style={styles.segText}>{s.weight}</Text> : null}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((s, i) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }]} />
            <Text style={styles.legendText}>
              {s.label} {s.weight}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  title: { color: colors.text, fontSize: font.body - 2, fontWeight: '700' },
  bar: { flexDirection: 'row', height: 18, borderRadius: 6, overflow: 'hidden' },
  seg: { alignItems: 'center', justifyContent: 'center' },
  segText: { color: colors.text, fontSize: font.caption - 2, fontWeight: '800' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 9, height: 9, borderRadius: 2 },
  legendText: { color: colors.muted, fontSize: font.caption - 1 },
})
