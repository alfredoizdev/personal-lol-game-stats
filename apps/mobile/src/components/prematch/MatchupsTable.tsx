import { StyleSheet, Text, View } from 'react-native'
import type { MatchupRow } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { colors, font, space } from '@/theme/tokens'

/** Lane opponents you lost to most in this role, from your own games only. */
export function MatchupsTable({ rows, ban }: { rows: MatchupRow[]; ban: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Toughest matchups</Text>
      {rows.length === 0 ? (
        <Text style={styles.muted} maxFontSizeMultiplier={1.15}>No lane opponent faced twice yet in this role.</Text>
      ) : (
        rows.map((r) => (
          <View key={r.championId} style={styles.row}>
            <ChampionPortrait championName={r.championName} size={32} ring={r.winRate < 50 ? 'loss' : 'win'} />
            <View style={styles.name}>
              <Text style={styles.champ} maxFontSizeMultiplier={1.15}>{r.championName}</Text>
              <Text style={styles.sub} maxFontSizeMultiplier={1.15}>
                {r.wins}W – {r.games - r.wins}L{r.fewGames ? ' · few games' : ''}
              </Text>
            </View>
            <View style={styles.rate}>
              <Text style={[styles.rateText, { color: r.winRate < 50 ? colors.loss : colors.win }]} maxFontSizeMultiplier={1.15}>{r.winRate}%</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${r.winRate}%`, backgroundColor: r.winRate < 50 ? colors.loss : colors.win }]} />
              </View>
            </View>
          </View>
        ))
      )}
      <Text style={styles.ban} maxFontSizeMultiplier={1.15}>{ban}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  title: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: font.caption + 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  name: { flex: 1 },
  champ: { color: colors.text, fontSize: font.body - 1, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: font.caption - 1 },
  rate: { width: 72, alignItems: 'flex-end', gap: 3 },
  rateText: { fontSize: font.body - 1, fontWeight: '800' },
  track: { width: 72, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  ban: { color: colors.text, fontSize: font.caption + 1, lineHeight: 19, paddingTop: space.xs },
})
