import { StyleSheet, Text, View } from 'react-native'
import { TIER_LABELS, tierBucket, type ChampionStat, type PerformanceProfile } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { RoleIcon } from '@/components/RoleIcon'
import { useChampionList } from '@/hooks/useChampionList'
import { gamesNote, winRateColor } from '@/lib/performance-ui'
import { tierColor } from '@/lib/row-rating'
import { colors, font, radius, space } from '@/theme/tokens'

/** Your most played champions in the period: record, most-played role and average tier (spec 2.6). */
export function ChampionsCard({ profile }: { profile: PerformanceProfile }) {
  const { champions } = useChampionList()
  const displayName = (c: ChampionStat) => champions.find((x) => x.id === c.championId)?.name ?? c.championName
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Your champions</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>{gamesNote(profile)} · most played first</Text>
      {profile.champions.map((c) => {
        const color = winRateColor(c.winRate)
        return (
          <View key={c.championId} style={styles.row}>
            <ChampionPortrait championName={c.championName} size={40} ring={c.winRate >= 50 ? 'win' : 'loss'} />
            <View style={styles.name}>
              <View style={styles.nameRow}>
                <Text style={styles.champ} maxFontSizeMultiplier={1.15}>{displayName(c)}</Text>
                {c.role ? <RoleIcon role={c.role} size={14} /> : null}
              </View>
              <Text style={styles.meta} maxFontSizeMultiplier={1.15}>
                {c.games} game{c.games === 1 ? '' : 's'} · {c.wins}W – {c.games - c.wins}L{c.fewGames ? ' · few games' : ''}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.rate, { color }]} maxFontSizeMultiplier={1.15}>{c.winRate}%</Text>
              {c.tier ? (
                <View style={[styles.badge, { borderColor: tierColor(tierBucket(c.tier)) }]} accessibilityLabel={`${c.tier} ${TIER_LABELS[c.tier]}`}>
                  <Text style={[styles.badgeText, { color: tierColor(tierBucket(c.tier)) }]} maxFontSizeMultiplier={1.15}>{c.tier}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.xs },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  name: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  champ: { color: colors.text, fontSize: font.body - 1, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: font.caption - 1 },
  right: { alignItems: 'flex-end', gap: 3 },
  rate: { fontSize: font.body - 1, fontWeight: '800' },
  badge: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { fontSize: font.caption - 2, fontWeight: '800' },
})
