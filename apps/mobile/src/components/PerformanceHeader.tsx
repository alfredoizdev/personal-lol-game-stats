import { StyleSheet, Text, View } from 'react-native'
import type { MatchAggregates } from '@/lib/match-aggregates'
import { colors, font, radius, space } from '@/theme/tokens'

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

export function PerformanceHeader({ agg }: { agg: MatchAggregates }) {
  const fmt = (n: number | null, suffix = '') => (n === null ? '—' : `${n}${suffix}`)
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Last {agg.games || 10} Games</Text>
      <Text style={styles.subtitle}>Overall Performance</Text>
      <View style={styles.row}>
        <Stat label="Avg KDA" value={fmt(agg.avgKda)} accent={colors.accent} />
        <View style={styles.divider} />
        <Stat label="CS / min" value={fmt(agg.avgCsPerMin)} accent={colors.you} />
        <View style={styles.divider} />
        <Stat label="Win Rate" value={fmt(agg.winRate, '%')} accent={colors.win} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: 2 },
  title: { color: colors.text, fontSize: font.body + 4, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: font.caption + 1, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  value: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  label: { color: colors.muted, fontSize: font.caption },
  divider: { width: 1, height: 36, backgroundColor: colors.border },
})
