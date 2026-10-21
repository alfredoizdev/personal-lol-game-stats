import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatDuration, formatKda, relativeTime, type MatchSummary } from '@lpp/shared'
import { ChampionPortrait } from './ChampionPortrait'
import { ItemRow } from './ItemRow'
import { colors, font, radius, space } from '@/theme/tokens'

const ROLE_LABEL: Record<string, string> = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' }

export function resultWord(s: MatchSummary): { text: string; color: string; ring: 'win' | 'loss' | 'none' } {
  if (s.remake) return { text: 'Remake', color: colors.muted, ring: 'none' }
  return s.me.win ? { text: 'Victory', color: colors.win, ring: 'win' } : { text: 'Defeat', color: colors.loss, ring: 'loss' }
}

export function MatchRow({ summary, now, onPress }: { summary: MatchSummary; now: number; onPress: () => void }) {
  const r = resultWord(summary)
  const me = summary.me
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <ChampionPortrait championName={me.championName} size={60} ring={r.ring} />
      <View style={styles.main}>
        <View style={styles.topRow}>
          <View style={styles.left}>
            <Text style={[styles.result, { color: r.color }]}>{r.text}</Text>
            <Text style={styles.champ}>{me.championName}</Text>
            <Text style={styles.meta}>{me.role ? ROLE_LABEL[me.role] : summary.queueLabel}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.big}>{me.kills} / {me.deaths} / {me.assists}</Text>
            <Text style={styles.meta}>{formatKda(me.kills, me.deaths, me.assists)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.big}>{me.csPerMin === null ? '—' : me.csPerMin.toFixed(1)}</Text>
            <Text style={styles.meta}>CS/min</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.big}>{formatDuration(summary.durationSec)}</Text>
            <Text style={styles.meta}>{relativeTime(summary.startedAt, now)}</Text>
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
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  left: { flex: 1.2 },
  col: { flex: 1, alignItems: 'center' },
  result: { fontSize: font.body, fontWeight: '800' },
  champ: { color: colors.text, fontSize: font.caption + 1 },
  meta: { color: colors.muted, fontSize: font.caption - 1 },
  big: { color: colors.text, fontSize: font.caption + 2, fontWeight: '700' },
})
