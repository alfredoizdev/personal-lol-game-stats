import { StyleSheet, Text, View } from 'react-native'
import type { ChampionSummary } from '@lpp/shared'
import { colors, font, space } from '@/theme/tokens'

const fmt = (n: number | null, d: number, suffix = '') => (n === null ? '—' : `${n.toFixed(d)}${suffix}`)

/** Your own record for `subject` ("with Zed as mid" or "as mid"). Honest about the sample size. */
export function ChampionSummaryCard({ subject, summary }: { subject: string; summary: ChampionSummary }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Stat value={String(summary.games)} label="Games" />
        <Stat value={fmt(summary.winRate, 0, '%')} label="Win rate" color={summary.winRate === null ? colors.text : summary.winRate >= 50 ? colors.win : colors.loss} />
        <Stat value={fmt(summary.avgKda, 1)} label="Avg KDA" />
        <Stat value={fmt(summary.avgCsPerMin, 1)} label="CS / min" />
      </View>
      {summary.games === 0 ? (
        <Text style={styles.note} maxFontSizeMultiplier={1.15}>No games {subject} among your loaded games.</Text>
      ) : summary.fewGames ? (
        <Text style={styles.note} maxFontSizeMultiplier={1.15}>Few games {subject} — numbers may swing.</Text>
      ) : null}
    </View>
  )
}

function Stat({ value, label, color = colors.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.value, { color }]} maxFontSizeMultiplier={1.15}>{value}</Text>
      <Text style={styles.label} maxFontSizeMultiplier={1.15}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  value: { fontSize: font.body + 2, fontWeight: '800' },
  label: { color: colors.muted, fontSize: font.caption - 1 },
  note: { color: colors.muted, fontSize: font.caption, textAlign: 'center', marginTop: space.sm, marginBottom: space.xs },
})
