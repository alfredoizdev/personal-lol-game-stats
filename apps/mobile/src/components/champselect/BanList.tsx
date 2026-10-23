import { StyleSheet, Text, View } from 'react-native'
import type { MatchupRow } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { colors, font, radius, space } from '@/theme/tokens'

/** Bans from your own games: the lane opponents in this role you lost to most. Sentences, never orders. */
export function BanList({ rows, sentence }: { rows: MatchupRow[]; sentence: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Bans from your games</Text>
      {rows.length === 0 ? <Text style={styles.muted} maxFontSizeMultiplier={1.15}>No lane opponent faced twice yet in this role.</Text> : null}
      {rows.map((r) => (
        <View key={r.championId} style={styles.row}>
          <ChampionPortrait championName={r.championName} size={40} ring={r.winRate < 50 ? 'loss' : 'win'} />
          <View style={styles.name}>
            <Text style={styles.champ} maxFontSizeMultiplier={1.15}>{r.championName}</Text>
            <Text style={styles.sub} maxFontSizeMultiplier={1.15}>
              {r.wins}W – {r.games - r.wins}L{r.fewGames ? ' · few games' : ''}
            </Text>
          </View>
          <Text style={[styles.rate, { color: r.winRate < 50 ? colors.loss : colors.win }]} maxFontSizeMultiplier={1.15}>{r.winRate}%</Text>
        </View>
      ))}
      <Text style={styles.sentence} maxFontSizeMultiplier={1.15}>{sentence}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.xs },
  title: { color: colors.text, fontSize: font.body + 1, fontWeight: '800', marginBottom: 2 },
  muted: { color: colors.muted, fontSize: font.caption + 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  name: { flex: 1 },
  champ: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: font.caption },
  rate: { fontSize: font.body + 1, fontWeight: '800' },
  sentence: { color: colors.text, fontSize: font.caption + 1, lineHeight: 19, paddingTop: space.xs },
})
