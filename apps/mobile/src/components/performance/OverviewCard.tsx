import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { TIER_LABELS, tierBucket, type PerformanceProfile } from '@lpp/shared'
import { SemiDonut } from '@/components/SemiDonut'
import { areaLine, fewGamesNote, ON_TARGET_SCORE, previousLabel, rangeLabel, recordLabel, streakLabel } from '@/lib/performance-ui'
import { tierColor } from '@/lib/row-rating'
import { colors, font, radius, space } from '@/theme/tokens'
import { RecentStrip } from './RecentStrip'

/**
 * Average match score with its own comparables (previous window, best/worst,
 * the 70 "on target" mark, the area averages), record, streak and the last-10
 * strip (spec 2.3; comparables added at the owner's request, 2026-10-22).
 */
export function OverviewCard({ profile }: { profile: PerformanceProfile }) {
  const color = profile.tier ? tierColor(tierBucket(profile.tier)) : colors.muted
  const streak = streakLabel(profile.streak)
  const few = fewGamesNote(profile)
  const previous = previousLabel(profile)
  const range = rangeLabel(profile)
  const areas = areaLine(profile)
  const role = profile.roles[0]?.role ?? 'MIDDLE'
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <SemiDonut score={profile.avgScore} size={84} color={color} label="avg match score" tick={ON_TARGET_SCORE} />
        <View style={styles.text}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.15}>{profile.tier ? `${profile.tier} · ${TIER_LABELS[profile.tier]}` : 'Overall · —'}</Text>
          <Text style={styles.record} maxFontSizeMultiplier={1.15}>{recordLabel(profile)}</Text>
          {streak ? <Text style={[styles.streak, { color: profile.streak?.kind === 'win' ? colors.win : colors.loss }]} maxFontSizeMultiplier={1.15}>{streak}</Text> : null}
        </View>
      </View>
      <View style={styles.context}>
        {previous ? <Text style={styles.line} maxFontSizeMultiplier={1.15}>{previous}</Text> : null}
        {range ? <Text style={styles.line} maxFontSizeMultiplier={1.15}>{range}</Text> : null}
        {areas ? <Text style={styles.line} maxFontSizeMultiplier={1.15}>{areas}</Text> : null}
        <Pressable onPress={() => router.push(`/(app)/(tabs)/matches/how-scored?role=${role}`)} accessibilityRole="link" hitSlop={6}>
          <Text style={styles.link} maxFontSizeMultiplier={1.15}>How it's scored ›</Text>
        </Pressable>
      </View>
      {few ? <Text style={styles.few} maxFontSizeMultiplier={1.15}>{few}</Text> : null}
      <RecentStrip recent={profile.recent} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 4 },
  kicker: { color: colors.muted, fontSize: font.caption - 1, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  record: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  streak: { fontSize: font.caption, fontWeight: '700' },
  context: { gap: 3, paddingTop: 2, paddingBottom: 4, borderTopWidth: 1, borderTopColor: colors.border },
  line: { color: colors.muted, fontSize: font.caption },
  link: { color: colors.accent, fontSize: font.caption, fontWeight: '700' },
  few: { color: colors.warn, fontSize: font.caption + 1 },
})
