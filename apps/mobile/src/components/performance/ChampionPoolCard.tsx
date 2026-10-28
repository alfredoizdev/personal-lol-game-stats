import { StyleSheet, Text, View } from 'react-native'
import { RECENT_FORM_N, type SnapshotChampion } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { useChampionList } from '@/hooks/useChampionList'
import { winRateColor } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/** The champions behind the last 20 games: one row each with the record and the win rate (owner, 2026-10-27: "la pool de esos champions"). */
export function ChampionPoolCard({ champions, games }: { champions: SnapshotChampion[]; games: number }) {
  const { champions: list } = useChampionList()
  const displayName = (c: SnapshotChampion) => list.find((x) => x.id === c.championId)?.name ?? c.championName
  if (champions.length === 0) return null
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Champion pool</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Who you played in the last {Math.min(games, RECENT_FORM_N)} game{games === 1 ? '' : 's'}</Text>
      {champions.map((c) => (
        <View key={c.championId} style={styles.row} accessibilityLabel={`${displayName(c)}: ${c.wins} wins ${c.games - c.wins} losses, ${c.winRate}% win rate`}>
          <ChampionPortrait championName={c.championName} size={40} ring={c.winRate >= 50 ? 'win' : 'loss'} />
          <View style={styles.name}>
            <Text style={styles.champ} maxFontSizeMultiplier={1.15} numberOfLines={1}>{displayName(c)}</Text>
            <Text style={styles.meta} maxFontSizeMultiplier={1.15}>{c.games} game{c.games === 1 ? '' : 's'} · {c.wins}W {c.games - c.wins}L</Text>
          </View>
          <Text style={[styles.rate, { color: winRateColor(c.winRate) }]} maxFontSizeMultiplier={1.15}>{c.winRate}% win rate</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: 2 },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  name: { flex: 1, gap: 2 },
  champ: { color: colors.text, fontSize: font.body - 1, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: font.caption },
  rate: { fontSize: font.caption + 1, fontWeight: '800' },
})
