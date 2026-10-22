import { StyleSheet, Text, View } from 'react-native'
import { formatDuration, formatKda, relativeTimeShort, type MatchSummary } from '@lpp/shared'
import { PortraitWithBadges } from './PortraitWithBadges'
import { ItemRow } from './ItemRow'
import { resultWord } from './MatchRow'
import { resultOf } from '@/lib/result-badge'
import { colors, font, radius, space } from '@/theme/tokens'

const ROLE_LABEL: Record<string, string> = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' }

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  )
}

export function MatchHero({ summary, now }: { summary: MatchSummary; now: number }) {
  const r = resultWord(summary)
  const me = summary.me
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <PortraitWithBadges championName={me.championName} size={84} ring={r.ring} result={resultOf(summary)} role={me.role} />
        <View style={styles.titleBlock}>
          <Text style={styles.champ}>{me.championName}</Text>
          <Text style={styles.meta}>{me.role ? ROLE_LABEL[me.role] : summary.gameMode}</Text>
          <View style={styles.items}>
            <ItemRow items={me.items} trinket={me.trinket} size={28} />
          </View>
        </View>
      </View>
      <View style={styles.statsRow}>
        <Stat value={`${me.kills} / ${me.deaths} / ${me.assists}`} label="KDA" sub={formatKda(me.kills, me.deaths, me.assists)} />
        <View style={styles.divider} />
        <Stat value={me.csPerMin === null ? '—' : me.csPerMin.toFixed(1)} label="CS / min" />
        <View style={styles.divider} />
        <Stat value={formatDuration(summary.durationSec)} label="Duration" />
        <View style={styles.divider} />
        <Stat value={relativeTimeShort(summary.startedAt, now)} label="Played" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.md },
  top: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  titleBlock: { flex: 1, gap: 2 },
  champ: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: font.caption + 1 },
  items: { marginTop: space.sm },
  statsRow: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: font.caption - 1 },
  statSub: { color: colors.text, fontSize: font.caption, fontWeight: '600' },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
})
