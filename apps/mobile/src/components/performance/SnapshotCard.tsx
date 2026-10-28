import { StyleSheet, Text, View } from 'react-native'
import { RECENT_FORM_N, ROLE_LABEL, type RecentSnapshot } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { RoleIcon } from '@/components/RoleIcon'
import { kdaLine, recordLine, winRateColor } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/** "Recent 20 games" (op.gg mobile, owner 2026-10-27): record and K/D/A on the left, most played champions and position on the right. */
export function SnapshotCard({ snapshot }: { snapshot: RecentSnapshot }) {
  const kda = kdaLine(snapshot)
  const title = snapshot.games >= RECENT_FORM_N ? `Recent ${RECENT_FORM_N} games` : snapshot.games === 1 ? 'Recent game' : `Recent ${snapshot.games} games`
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>{title}</Text>
        {snapshot.champions.length ? <Text style={styles.colLabel} maxFontSizeMultiplier={1.15}>Most played</Text> : null}
        {snapshot.mainRole ? <Text style={[styles.colLabel, styles.posLabel]} maxFontSizeMultiplier={1.15}>Position</Text> : null}
      </View>
      <Text style={styles.record} maxFontSizeMultiplier={1.15}>{recordLine(snapshot)}</Text>
      <View style={styles.body}>
        <View style={styles.left}>
          <Text style={styles.kda} maxFontSizeMultiplier={1.15} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {snapshot.kills.toFixed(1)} / <Text style={styles.deaths}>{snapshot.deaths.toFixed(1)}</Text> / {snapshot.assists.toFixed(1)}
          </Text>
          <Text style={styles.ratio} maxFontSizeMultiplier={1.15}>K / D / A per game</Text>
          <Text style={styles.ratio} maxFontSizeMultiplier={1.15}>{kda.ratio}</Text>
        </View>
        <View style={styles.champs}>
          {snapshot.champions.map((c) => (
            <View key={c.championId} style={styles.champ} accessibilityLabel={`${c.championName} ${c.games} games ${c.winRate}% win`}>
              <ChampionPortrait championName={c.championName} size={40} ring={c.winRate >= 50 ? 'win' : 'loss'} />
              <Text style={[styles.pct, { color: winRateColor(c.winRate) }]} maxFontSizeMultiplier={1.15}>{c.winRate}%</Text>
              <Text style={styles.tiny} maxFontSizeMultiplier={1.15}>{c.games} game{c.games === 1 ? '' : 's'}</Text>
            </View>
          ))}
        </View>
        {snapshot.mainRole ? (
          <View style={styles.pos} accessibilityLabel={`${ROLE_LABEL[snapshot.mainRole.role]} ${snapshot.mainRole.pct}% of games`}>
            <RoleIcon role={snapshot.mainRole.role} size={28} />
            <Text style={styles.pct} maxFontSizeMultiplier={1.15}>{ROLE_LABEL[snapshot.mainRole.role]}</Text>
            <Text style={styles.tiny} maxFontSizeMultiplier={1.15}>{snapshot.mainRole.pct}% of games</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { flex: 1, color: colors.muted, fontSize: font.caption, fontWeight: '700' },
  colLabel: { color: colors.muted, fontSize: font.caption - 2, fontWeight: '600' },
  posLabel: { width: 60, textAlign: 'center', marginLeft: space.sm },
  body: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  left: { flex: 1, gap: 2 },
  record: { color: colors.muted, fontSize: font.caption + 1, fontWeight: '600' },
  kda: { color: colors.text, fontSize: font.body + 2, fontWeight: '800', letterSpacing: -0.3 },
  deaths: { color: colors.loss },
  ratio: { color: colors.muted, fontSize: font.caption },
  champs: { flexDirection: 'row', gap: 6 },
  champ: { alignItems: 'center', gap: 2 },
  tiny: { color: colors.muted, fontSize: font.caption - 4 },
  pct: { color: colors.text, fontSize: font.caption - 1, fontWeight: '700' },
  pos: { width: 60, alignItems: 'center', gap: 2, marginLeft: space.sm },
})
