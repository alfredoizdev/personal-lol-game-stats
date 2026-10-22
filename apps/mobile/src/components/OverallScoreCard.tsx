import { StyleSheet, Text, View } from 'react-native'
import type { MatchAnalysis } from '@lpp/shared'
import { ratingColor } from '@/lib/area-ui'
import { SemiDonut } from './SemiDonut'
import { colors, font, radius, space } from '@/theme/tokens'

export function OverallScoreCard({ analysis, baselineLoading }: { analysis: Extract<MatchAnalysis, { analyzable: true }>; baselineLoading: boolean }) {
  const note = baselineLoading
    ? 'Calculating your average…'
    : analysis.baselineN >= 3
      ? `"vs you" = your last ${analysis.baselineN} games in this role`
      : 'Few games in this role yet — "vs you" hidden'
  return (
    <View style={styles.card}>
      <SemiDonut score={analysis.overall} size={96} color={ratingColor(analysis.overallRating)} />
      <View style={styles.text}>
        <Text style={styles.kicker}>Overall · {analysis.overallRating ?? '—'}</Text>
        <Text style={styles.headline}>{analysis.headline}</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md },
  text: { flex: 1, gap: 3 },
  kicker: { color: colors.muted, fontSize: font.caption, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  headline: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  note: { color: colors.muted, fontSize: font.caption },
})
