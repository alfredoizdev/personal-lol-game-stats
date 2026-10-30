import { StyleSheet, Text, View } from 'react-native'
import { GOAL_PROGRESS_WEEKS, type GoalProgress } from '@lpp/shared'
import { goalMetLine, goalTargetLine, goalTrendLine } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

const CHART_H = 80

/**
 * "Your goal, week by week" (owner, 2026-10-29: a personal trainer measures what it
 * set): one bar per week for the goal metric in your main role, green when the
 * week's average met today's target and red when it did not, the target as a thin
 * line across, and one sentence reading the trend from the oldest week to this one.
 */
export function GoalProgressCard({ progress }: { progress: GoalProgress }) {
  const trend = goalTrendLine(progress)
  const values = progress.weeks.map((w) => w.avg ?? 0)
  const max = Math.max(...values, progress.target) * 1.15 || 1
  const targetY = Math.round((progress.target / max) * CHART_H)
  const oldestToNewest = [...progress.weeks].reverse()
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Your goal, week by week</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>{goalTargetLine(progress)}</Text>
      <Text style={styles.headline} maxFontSizeMultiplier={1.15}>{trend.text}</Text>
      <Text style={[styles.word, { color: trend.color }]} maxFontSizeMultiplier={1.15}>{trend.word}</Text>
      <View style={styles.chart} accessibilityLabel={`${progress.label} per week, oldest to newest: ${oldestToNewest.map((w) => (w.avg === null ? 'no games' : String(w.avg))).join(', ')}`}>
        <View style={[styles.targetLine, { bottom: targetY }]}>
          <Text style={styles.targetText} maxFontSizeMultiplier={1.15}>target {progress.metric === 'kpPct' ? `${progress.target.toFixed(0)}%` : progress.target.toFixed(progress.decimals)}</Text>
        </View>
        {oldestToNewest.map((w) => {
          const h = w.avg === null ? 0 : Math.max(4, Math.round((w.avg / max) * CHART_H))
          const good = w.avg !== null && (progress.lowerIsBetter ? w.avg <= progress.target : w.avg >= progress.target)
          return (
            <View key={w.weeksAgo} style={styles.col}>
              {w.avg === null ? <View style={styles.empty} /> : <View style={[styles.bar, { height: h, backgroundColor: good ? colors.win : colors.loss }]} />}
            </View>
          )
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText} maxFontSizeMultiplier={1.15}>{GOAL_PROGRESS_WEEKS - 1} weeks ago</Text>
        <Text style={styles.axisText} maxFontSizeMultiplier={1.15}>This week</Text>
      </View>
      <Text style={styles.foot} maxFontSizeMultiplier={1.15}>{goalMetLine(progress.weeks[0]!)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption, marginTop: -4 },
  headline: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  word: { fontSize: font.caption + 1, fontWeight: '800', marginTop: -6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chart: { height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: space.md },
  targetLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.muted, opacity: 0.7 },
  targetText: { position: 'absolute', left: 0, bottom: 1, color: colors.muted, fontSize: font.caption - 2, fontWeight: '700' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: CHART_H },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  empty: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginBottom: 1 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  axisText: { color: colors.muted, fontSize: font.caption - 1 },
  foot: { color: colors.muted, fontSize: font.caption + 1 },
})
