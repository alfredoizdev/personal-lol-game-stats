import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatDuration, formatKda, queueTag, relativeTimeShort, type MatchSummary } from '@lpp/shared'
import { PortraitWithBadges } from './PortraitWithBadges'
import { ItemRow } from './ItemRow'
import { resultOf } from '@/lib/result-badge'
import { quickRating, tierColor } from '@/lib/row-rating'
import { colors, font, radius, space } from '@/theme/tokens'

export function resultWord(s: MatchSummary): { text: string; color: string; ring: 'win' | 'loss' | 'none' } {
  if (s.remake) return { text: 'Remake', color: colors.muted, ring: 'none' }
  return s.me.win ? { text: 'Victory', color: colors.win, ring: 'win' } : { text: 'Defeat', color: colors.loss, ring: 'loss' }
}

export function MatchRow({ summary, now, onPress }: { summary: MatchSummary; now: number; onPress: () => void }) {
  const r = resultWord(summary)
  const me = summary.me
  const rating = quickRating(summary)
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <PortraitWithBadges championName={me.championName} size={60} ring={r.ring} result={resultOf(summary)} role={me.role} tier={rating ? { text: rating.tier, color: tierColor(rating.bucket) } : null} />
      <View style={styles.main}>
        <View style={styles.topRow}>
          <View style={styles.colKda}>
            <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {me.kills}/{me.deaths}/{me.assists}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>{formatKda(me.kills, me.deaths, me.assists)}</Text>
          </View>
          <View style={styles.colCs}>
            <Text style={styles.big} numberOfLines={1}>{me.csPerMin === null ? '—' : me.csPerMin.toFixed(1)}</Text>
            <Text style={styles.meta} numberOfLines={1}>CS/min</Text>
          </View>
          <View style={styles.colTime}>
            <Text style={styles.big} numberOfLines={1}>{formatDuration(summary.durationSec)}</Text>
            <Text style={styles.meta} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{queueTag(summary.queueId)} · {relativeTimeShort(summary.startedAt, now)}</Text>
          </View>
        </View>
        <ItemRow items={me.items} trinket={me.trinket} size={24} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  main: { flex: 1, gap: space.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 6 },
  colKda: { flex: 1, alignItems: 'center' },
  colCs: { flex: 1, alignItems: 'center' },
  colTime: { flex: 1.2, alignItems: 'center' },
  meta: { color: colors.muted, fontSize: font.caption - 1 },
  big: { color: colors.text, fontSize: font.caption + 2, fontWeight: '700', letterSpacing: -0.3 },
})
