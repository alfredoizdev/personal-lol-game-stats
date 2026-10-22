import { StyleSheet, Text, View } from 'react-native'
import { TIER_LABELS, tierBucket, type PerformanceProfile } from '@lpp/shared'
import { SemiDonut } from '@/components/SemiDonut'
import { gamesNote, recordLabel, streakLabel } from '@/lib/performance-ui'
import { tierColor } from '@/lib/row-rating'
import { colors, font, radius, space } from '@/theme/tokens'
import { RecentStrip } from './RecentStrip'

/** Average match score, record, streak, last-10 strip and the descriptive headline (spec 2.3). */
export function OverviewCard({ profile }: { profile: PerformanceProfile }) {
  const color = profile.tier ? tierColor(tierBucket(profile.tier)) : colors.muted
  const streak = streakLabel(profile.streak)
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <SemiDonut score={profile.avgScore} size={84} color={color} label="avg score" />
        <View style={styles.text}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.15}>{profile.tier ? `${profile.tier} · ${TIER_LABELS[profile.tier]}` : 'Overall · —'}</Text>
          <Text style={styles.record} maxFontSizeMultiplier={1.15}>{recordLabel(profile)}</Text>
          {streak ? <Text style={[styles.streak, { color: profile.streak?.kind === 'win' ? colors.win : colors.loss }]} maxFontSizeMultiplier={1.15}>{streak}</Text> : null}
          <Text style={styles.note} maxFontSizeMultiplier={1.15}>{gamesNote(profile)}</Text>
        </View>
      </View>
      <Text style={styles.headline} maxFontSizeMultiplier={1.15}>{profile.headline}</Text>
      <RecentStrip recent={profile.recent} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 3 },
  kicker: { color: colors.muted, fontSize: font.caption - 1, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  record: { color: colors.text, fontSize: font.body - 1, fontWeight: '800' },
  streak: { fontSize: font.caption, fontWeight: '700' },
  note: { color: colors.muted, fontSize: font.caption - 1 },
  headline: { color: colors.text, fontSize: font.caption + 1, lineHeight: 19 },
})
