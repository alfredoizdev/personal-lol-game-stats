import { StyleSheet, Text, View } from 'react-native'
import { rating, ROLE_LABEL, type PerformanceProfile } from '@lpp/shared'
import { RoleIcon } from '@/components/RoleIcon'
import { ratingColor } from '@/lib/area-ui'
import { roleRankNote } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/** One row per role played: games, win rate and the mean match score as a bar (spec 2.4). */
export function RolesCard({ profile }: { profile: PerformanceProfile }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Where you are strongest</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Bar = average match score · win rate beside it</Text>
      {profile.roles.map((r) => {
        const color = r.avgScore === null ? colors.muted : ratingColor(rating(r.avgScore))
        return (
          <View key={r.role} style={styles.row}>
            <RoleIcon role={r.role} size={20} />
            <View style={styles.body}>
              <View style={styles.top}>
                <Text style={styles.role} maxFontSizeMultiplier={1.15}>
                  {ROLE_LABEL[r.role]}
                  {r.fewGames ? <Text style={styles.few}>  few games</Text> : null}
                </Text>
                <Text style={styles.meta} maxFontSizeMultiplier={1.15}>
                  {r.games} game{r.games === 1 ? '' : 's'} · <Text style={{ color: r.winRate >= 50 ? colors.win : colors.loss }}>{r.winRate}% win</Text>
                </Text>
              </View>
              <View style={styles.barRow}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${r.avgScore ?? 0}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.score, { color }]} maxFontSizeMultiplier={1.15}>{r.avgScore ?? '—'}</Text>
              </View>
            </View>
          </View>
        )
      })}
      <Text style={styles.note} maxFontSizeMultiplier={1.15}>{roleRankNote(profile)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.xs },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  body: { flex: 1, gap: 5 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  role: { color: colors.text, fontSize: font.body - 1, fontWeight: '700' },
  few: { color: colors.muted, fontSize: font.caption - 1, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: font.caption },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  score: { width: 28, textAlign: 'right', fontSize: font.caption + 1, fontWeight: '800' },
  note: { color: colors.text, fontSize: font.caption + 1, paddingTop: space.sm },
})
