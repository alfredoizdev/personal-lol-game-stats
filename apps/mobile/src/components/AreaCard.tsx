import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { AreaResult } from '@lpp/shared'
import { ratingColor } from '@/lib/area-ui'
import { riotErrorCode } from '@/lib/riot-api'
import { SemiDonut } from './SemiDonut'
import { SubrowBar } from './SubrowBar'
import { colors, font, radius, space } from '@/theme/tokens'

/**
 * One scored area: semi-donut with the score, the area name and rating word,
 * the sentence, the sub-rows with bars, and (Farming / Lane) a chart.
 */
export function AreaCard({
  area,
  baselineN,
  baselineLoading,
  chart,
  timelineError,
  onRetryTimeline,
}: {
  area: AreaResult
  baselineN: number
  baselineLoading: boolean
  chart?: ReactNode
  timelineError?: unknown
  onRetryTimeline?: () => void
}) {
  const needsTimeline = area.key === 'farming' || area.key === 'lane'
  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <SemiDonut score={area.score} size={120} color={ratingColor(area.rating)} />
        <Text style={styles.name} maxFontSizeMultiplier={1.15}>{area.label}</Text>
        <Text style={[styles.rating, { color: ratingColor(area.rating) }]} maxFontSizeMultiplier={1.15}>{area.rating ?? 'Not scored'}</Text>
      </View>

      {area.hiddenReason ? <Text style={styles.reason}>{area.hiddenReason}</Text> : null}
      {area.sentence ? <Text style={styles.sentence} maxFontSizeMultiplier={1.15}>{area.sentence}</Text> : null}

      {needsTimeline && timelineError ? (
        <View style={styles.retryRow}>
          <Text style={styles.reason}>{riotErrorCode(timelineError) === 'RATE_LIMITED' ? 'Riot is rate-limiting timeline requests.' : "Couldn't load the timeline."}</Text>
          {onRetryTimeline ? (
            <Pressable onPress={onRetryTimeline} accessibilityRole="button" style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {area.subrows.length ? (
        <View>
          {area.subrows.map((r) => (
            <SubrowBar key={r.key} subrow={r} baselineN={baselineN} baselineLoading={baselineLoading} />
          ))}
        </View>
      ) : null}

      {chart}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  hero: { alignItems: 'center', gap: 2, paddingTop: space.xs },
  name: { color: colors.text, fontSize: font.body + 3, fontWeight: '800', marginTop: 2 },
  rating: { fontSize: font.body - 2, fontWeight: '700' },
  sentence: { color: colors.text, fontSize: font.body - 2, lineHeight: 21, textAlign: 'center', paddingHorizontal: space.xs },
  reason: { color: colors.muted, fontSize: font.caption + 1, textAlign: 'center' },
  retryRow: { alignItems: 'center', gap: 6 },
  retry: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  retryText: { color: colors.text, fontWeight: '700', fontSize: font.caption + 1 },
})
