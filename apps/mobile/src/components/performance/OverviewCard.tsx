import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { TIER_LABELS, tierBucket, type PerformanceProfile } from '@lpp/shared'
import { SemiDonut } from '@/components/SemiDonut'
import { fewGamesNote, ON_TARGET_SCORE, previousDelta, recordLabel, streakLabel } from '@/lib/performance-ui'
import { tierColor } from '@/lib/row-rating'
import { colors, font, radius, space } from '@/theme/tokens'
import { RecentStrip } from './RecentStrip'

/**
 * Average match score with three own comparables in one row (previous window,
 * best/worst, the 70 "on target" mark that also opens How it's scored), the
 * record, the streak and the last-10 strip. Kept to one visual + one line per
 * fact at the owner's request (2026-10-22).
 */
export function OverviewCard({ profile }: { profile: PerformanceProfile }) {
  const color = profile.tier ? tierColor(tierBucket(profile.tier)) : colors.muted
  const streak = streakLabel(profile.streak)
  const few = fewGamesNote(profile)
  const delta = previousDelta(profile)
  const role = profile.roles[0]?.role ?? 'MIDDLE'
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <SemiDonut score={profile.avgScore} size={84} color={color} label="avg score" tick={ON_TARGET_SCORE} />
        <View style={styles.text}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.15}>{profile.tier ? `${profile.tier} · ${TIER_LABELS[profile.tier]}` : 'Overall · —'}</Text>
          <Text style={styles.record} maxFontSizeMultiplier={1.15}>{recordLabel(profile)}</Text>
          {streak ? <Text style={[styles.streak, { color: profile.streak?.kind === 'win' ? colors.win : colors.loss }]} maxFontSizeMultiplier={1.15}>{streak}</Text> : null}
        </View>
      </View>
      <View style={styles.facts}>
        <Fact value={delta ?? '—'} label={profile.previousN ? `vs previous ${profile.previousN}` : 'vs previous'} color={delta?.startsWith('+') ? colors.win : delta?.startsWith('−') ? colors.loss : colors.text} />
        <View style={styles.divider} />
        <Fact value={profile.bestScore === null ? '—' : `${profile.bestScore} / ${profile.worstScore}`} label="best / worst" />
        <View style={styles.divider} />
        <Pressable style={styles.fact} onPress={() => router.push(`/(app)/(tabs)/matches/how-scored?role=${role}`)} accessibilityRole="link" accessibilityLabel="How it's scored">
          <Text style={[styles.value, { color: colors.accent }]} maxFontSizeMultiplier={1.15}>{ON_TARGET_SCORE} ›</Text>
          <Text style={styles.label} maxFontSizeMultiplier={1.15}>on target · how?</Text>
        </Pressable>
      </View>
      {few ? <Text style={styles.few} maxFontSizeMultiplier={1.15}>{few}</Text> : null}
      <RecentStrip recent={profile.recent} />
    </View>
  )
}

function Fact({ value, label, color = colors.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.fact}>
      <Text style={[styles.value, { color }]} maxFontSizeMultiplier={1.15}>{value}</Text>
      <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.15}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 4 },
  kicker: { color: colors.muted, fontSize: font.caption - 1, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  record: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  streak: { fontSize: font.caption, fontWeight: '700' },
  facts: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  fact: { flex: 1, alignItems: 'center', gap: 2 },
  value: { fontSize: font.body + 1, fontWeight: '800' },
  label: { color: colors.muted, fontSize: font.caption - 2 },
  divider: { width: 1, height: 28, backgroundColor: colors.border },
  few: { color: colors.warn, fontSize: font.caption + 1 },
})
