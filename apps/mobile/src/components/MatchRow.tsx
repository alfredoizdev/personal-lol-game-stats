import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatDuration, type MatchSummary } from '@lpp/shared'
import { PortraitWithBadges } from './PortraitWithBadges'
import { ItemRow } from './ItemRow'
import { rowMeta } from '@/lib/match-row-view'
import { resultOf } from '@/lib/result-badge'
import { quickRating, tierColor } from '@/lib/row-rating'
import { colors, font, radius, space } from '@/theme/tokens'

export function resultWord(s: MatchSummary): { text: string; color: string; ring: 'win' | 'loss' | 'none' } {
  if (s.remake) return { text: 'Remake', color: colors.muted, ring: 'none' }
  return s.me.win ? { text: 'Victory', color: colors.win, ring: 'win' } : { text: 'Defeat', color: colors.loss, ring: 'loss' }
}

const STRIP: Record<'win' | 'loss' | 'none', { bg: string; letter: string }> = {
  win: { bg: 'rgba(45, 212, 166, 0.22)', letter: 'W' },
  loss: { bg: 'rgba(251, 92, 122, 0.22)', letter: 'L' },
  none: { bg: 'rgba(154, 149, 199, 0.18)', letter: 'R' },
}

/**
 * One recent game, op.gg-style (owner, 2026-10-27): a result strip with W/L and the
 * duration, the champion with its badges, the KDA with deaths in red and the K/P line,
 * the queue and time ago on the right, items below.
 */
export function MatchRow({ summary, now, onPress }: { summary: MatchSummary; now: number; onPress: () => void }) {
  const r = resultWord(summary)
  const me = summary.me
  const rating = quickRating(summary)
  const meta = rowMeta(summary, now)
  const strip = STRIP[r.ring]
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${r.text}, ${me.championName}, ${me.kills} ${me.deaths} ${me.assists}, ${meta.queue}, ${meta.when}`} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.strip, { backgroundColor: strip.bg }]}>
        <Text style={[styles.stripLetter, { color: r.color }]} allowFontScaling={false}>{strip.letter}</Text>
        <View style={[styles.stripRule, { backgroundColor: r.color }]} />
        <Text style={styles.stripTime} numberOfLines={1} allowFontScaling={false}>{formatDuration(summary.durationSec)}</Text>
      </View>
      <PortraitWithBadges championName={me.championName} size={56} ring={r.ring} result={resultOf(summary)} role={me.role} tier={rating ? { text: rating.tier, color: tierColor(rating.bucket) } : null} />
      <View style={styles.main}>
        <View style={styles.topRow}>
          <View style={styles.kdaBlock}>
            <Text style={styles.kda} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {me.kills} / <Text style={styles.deaths}>{me.deaths}</Text> / {me.assists}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>{meta.kp ?? `${me.csPerMin === null ? '—' : me.csPerMin.toFixed(1)} CS/min`}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.sub} numberOfLines={1}>{meta.queue}</Text>
            <Text style={styles.sub} numberOfLines={1}>{meta.when}</Text>
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
    gap: space.sm + 2,
    paddingRight: space.sm + 2,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    alignItems: 'center',
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  strip: { width: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: space.sm },
  stripLetter: { fontSize: font.body + 1, fontWeight: '800' },
  stripRule: { width: 14, height: 2, borderRadius: 1, opacity: 0.6 },
  stripTime: { color: colors.muted, fontSize: font.caption - 2, fontWeight: '600' },
  main: { flex: 1, gap: 6, paddingVertical: space.sm + 2 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  kdaBlock: { flex: 1, gap: 1 },
  kda: { color: colors.text, fontSize: font.body + 1, fontWeight: '800', letterSpacing: -0.3 },
  deaths: { color: colors.loss },
  sub: { color: colors.muted, fontSize: font.caption - 1 },
  metaBlock: { alignItems: 'flex-end', gap: 1 },
})
