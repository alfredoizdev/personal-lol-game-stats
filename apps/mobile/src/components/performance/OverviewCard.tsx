import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ON_TARGET_SCORE, scoreOn10, TIER_LABELS, tierBucket, type PerformanceProfile } from '@lpp/shared'
import { SemiDonut } from '@/components/SemiDonut'
import { fewGamesNote, on10, onTargetLabel, recentForm, recordLabel, streakLabel } from '@/lib/performance-ui'
import { tierColor } from '@/lib/row-rating'
import { colors, font, radius, space } from '@/theme/tokens'
import { RecentStrip } from './RecentStrip'

const TARGET_ON_10 = scoreOn10(ON_TARGET_SCORE).toFixed(1)

/**
 * Average match score on the owner's 1–10 ladder over the last 100 games, with
 * three own comparables (recent form = last 20, best/worst, games on target),
 * the record, the streak and the last-10 strip. One visual + one line per fact
 * (owner, 2026-10-22).
 */
export function OverviewCard({ profile }: { profile: PerformanceProfile }) {
  const color = profile.tier ? tierColor(tierBucket(profile.tier)) : colors.muted
  const streak = streakLabel(profile.streak)
  const few = fewGamesNote(profile)
  const recent = recentForm(profile)
  const role = profile.roles[0]?.role ?? 'MIDDLE'
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <SemiDonut score={profile.avgScore} text={on10(profile.avgScore)} size={84} color={color} label="avg score" tick={ON_TARGET_SCORE} />
        <View style={styles.text}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.15}>{profile.tier ? `${profile.tier} · ${TIER_LABELS[profile.tier]}` : 'Overall · —'}</Text>
          <Text style={styles.record} maxFontSizeMultiplier={1.15}>{recordLabel(profile)}</Text>
          {streak ? <Text style={[styles.streak, { color: profile.streak?.kind === 'win' ? colors.win : colors.loss }]} maxFontSizeMultiplier={1.15}>{streak}</Text> : null}
        </View>
      </View>
      <View style={styles.facts}>
        <Fact value={recent?.value ?? '—'} label={recent?.label ?? 'recent form'} color={recent?.trend === 'up' ? colors.win : recent?.trend === 'down' ? colors.loss : colors.text} />
        <View style={styles.divider} />
        <Fact value={profile.bestScore === null ? '—' : `${on10(profile.bestScore)} / ${on10(profile.worstScore)}`} label="best / worst" />
        <View style={styles.divider} />
        <Fact value={onTargetLabel(profile)} label={`games at ${TARGET_ON_10}+`} />
      </View>
      <Pressable onPress={() => router.push(`/(app)/(tabs)/matches/how-scored?role=${role}`)} accessibilityRole="link" hitSlop={6}>
        <Text style={styles.link} maxFontSizeMultiplier={1.15}>Score on 10 · {TARGET_ON_10} = every role target met · How it's scored ›</Text>
      </Pressable>
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
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
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
  link: { color: colors.muted, fontSize: font.caption - 2 },
  few: { color: colors.warn, fontSize: font.caption + 1 },
})
