import { StyleSheet, Text, View } from 'react-native'
import type { PickRow } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { colors, font, radius, space } from '@/theme/tokens'

const fmt = (n: number | null, d: number) => (n === null ? '—' : n.toFixed(d))

function Row({ r }: { r: PickRow }) {
  return (
    <View style={styles.row}>
      <ChampionPortrait championName={r.championName} size={40} ring={r.winRate >= 50 ? 'win' : 'loss'} />
      <View style={styles.name}>
        <Text style={styles.champ} maxFontSizeMultiplier={1.15}>{r.championName}</Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.15}>
          {r.wins}W – {r.games - r.wins}L · KDA {fmt(r.avgKda, 1)} · {fmt(r.avgCsPerMin, 1)} CS/min{r.fewGames ? ' · few games' : ''}
        </Text>
      </View>
      <Text style={[styles.rate, { color: r.winRate >= 50 ? colors.win : colors.loss }]} maxFontSizeMultiplier={1.15}>{r.winRate}%</Text>
    </View>
  )
}

/** Your picks for the role, from your own games: best win rate with 3+ games, then the champions you play most. */
export function PickList({ best, mostPlayed }: { best: PickRow[]; mostPlayed: PickRow[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Your picks</Text>
      {best.length === 0 && mostPlayed.length === 0 ? <Text style={styles.muted} maxFontSizeMultiplier={1.15}>No games of yours in this role among your loaded games.</Text> : null}
      {best.length ? <Text style={styles.section} maxFontSizeMultiplier={1.15}>Best win rate (3+ games)</Text> : null}
      {best.map((r) => <Row key={r.championId} r={r} />)}
      {mostPlayed.length ? <Text style={styles.section} maxFontSizeMultiplier={1.15}>Most played</Text> : null}
      {mostPlayed.map((r) => <Row key={r.championId} r={r} />)}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.xs },
  title: { color: colors.text, fontSize: font.body + 1, fontWeight: '800', marginBottom: 2 },
  section: { color: colors.muted, fontSize: font.caption, fontWeight: '700', marginTop: space.xs },
  muted: { color: colors.muted, fontSize: font.caption + 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  name: { flex: 1 },
  champ: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: font.caption },
  rate: { fontSize: font.body + 1, fontWeight: '800' },
})
