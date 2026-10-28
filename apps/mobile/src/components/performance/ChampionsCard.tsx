import { StyleSheet, Text, View } from 'react-native'
import type { ChampionStat, PerformanceProfile } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { RoleIcon } from '@/components/RoleIcon'
import { useChampionList } from '@/hooks/useChampionList'
import { winRateColor } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

const LIMIT = 5

/** Your five most played champions in the window: games, win rate and KDA (op.gg's champion list, owner 2026-10-27). */
export function ChampionsCard({ profile }: { profile: PerformanceProfile }) {
  const { champions } = useChampionList()
  const displayName = (c: ChampionStat) => champions.find((x) => x.id === c.championId)?.name ?? c.championName
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Champions</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Most played in these games · record and KDA</Text>
      {profile.champions.slice(0, LIMIT).map((c) => (
        <View key={c.championId} style={styles.row} accessibilityLabel={`${displayName(c)}: ${c.wins} wins ${c.games - c.wins} losses, ${c.winRate}% win rate, ${c.kda === null ? 'perfect' : c.kda} KDA`}>
          <ChampionPortrait championName={c.championName} size={40} ring={c.winRate >= 50 ? 'win' : 'loss'} />
          <View style={styles.name}>
            <View style={styles.nameRow}>
              <Text style={styles.champ} maxFontSizeMultiplier={1.15} numberOfLines={1}>{displayName(c)}</Text>
              {c.role ? <RoleIcon role={c.role} size={14} /> : null}
            </View>
            <Text style={styles.meta} maxFontSizeMultiplier={1.15}>
              {c.wins}W {c.games - c.wins}L · <Text style={{ color: winRateColor(c.winRate), fontWeight: '800' }}>{c.winRate}% win rate</Text>
            </Text>
          </View>
          <Text style={styles.kda} maxFontSizeMultiplier={1.15}>{c.kda === null ? 'Perfect' : `${c.kda.toFixed(1)} KDA`}</Text>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  champ: { color: colors.text, fontSize: font.body - 1, fontWeight: '700', flexShrink: 1 },
  meta: { color: colors.muted, fontSize: font.caption },
  kda: { color: colors.text, fontSize: font.body - 1, fontWeight: '800' },
})
