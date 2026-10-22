import { StyleSheet, Text, View } from 'react-native'
import type { MatchupStat, PerformanceProfile } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { RoleIcon } from '@/components/RoleIcon'
import { useChampionList } from '@/hooks/useChampionList'
import { winRateColor } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/** Lane opponents you lose to most, beat most, and split evenly with, across roles, over the same 100 games (spec 2.7). */
export function MatchupsCard({ profile }: { profile: PerformanceProfile }) {
  const { champions } = useChampionList()
  const displayName = (m: MatchupStat) => champions.find((x) => x.id === m.championId)?.name ?? m.championName
  const list = (rows: MatchupStat[]) =>
    rows.map((m) => {
      const color = winRateColor(m.winRate)
      return (
        <View key={`${m.championId}:${m.role}`} style={styles.row}>
          <ChampionPortrait championName={m.championName} size={32} ring={m.winRate >= 50 ? 'win' : 'loss'} />
          <View style={styles.name}>
            <View style={styles.nameRow}>
              <Text style={styles.champ} maxFontSizeMultiplier={1.15}>{displayName(m)}</Text>
              <RoleIcon role={m.role} size={13} />
            </View>
            <Text style={styles.meta} maxFontSizeMultiplier={1.15}>
              {m.wins}W – {m.games - m.wins}L{m.fewGames ? ' · few games' : ''}
            </Text>
          </View>
          <View style={styles.rate}>
            <Text style={[styles.rateText, { color }]} maxFontSizeMultiplier={1.15}>{m.winRate}%</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${m.winRate}%`, backgroundColor: color }]} />
            </View>
          </View>
        </View>
      )
    })
  const none = profile.toughest.length === 0 && profile.best.length === 0 && profile.even.length === 0
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Lane matchups</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Lane opponents faced at least twice in your last {profile.matchupGames} games</Text>
      {none ? (
        <Text style={styles.muted} maxFontSizeMultiplier={1.15}>No lane opponent faced twice yet.</Text>
      ) : (
        <>
          {profile.toughest.length ? <Text style={styles.section} maxFontSizeMultiplier={1.15}>You lose to</Text> : null}
          {list(profile.toughest)}
          {profile.best.length ? <Text style={[styles.section, profile.toughest.length ? styles.sectionGap : null]} maxFontSizeMultiplier={1.15}>You beat</Text> : null}
          {list(profile.best)}
          {profile.even.length ? <Text style={[styles.section, profile.toughest.length || profile.best.length ? styles.sectionGap : null]} maxFontSizeMultiplier={1.15}>Even</Text> : null}
          {list(profile.even)}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.xs },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption, marginBottom: space.xs },
  section: { color: colors.muted, fontSize: font.caption - 1, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  sectionGap: { marginTop: space.sm },
  muted: { color: colors.muted, fontSize: font.caption + 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  name: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  champ: { color: colors.text, fontSize: font.body - 1, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: font.caption - 1 },
  rate: { width: 72, alignItems: 'flex-end', gap: 3 },
  rateText: { fontSize: font.body - 1, fontWeight: '800' },
  track: { width: 72, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
})
