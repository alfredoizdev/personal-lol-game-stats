import { StyleSheet, Text, View } from 'react-native'
import type { PerformanceProfile } from '@lpp/shared'
import { ratingColor } from '@/lib/area-ui'
import { subrowLine } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/** Farming / Combat / Vision averaged over the period, each with its sub-rows vs the role target (spec 2.5). */
export function AreasCard({ profile }: { profile: PerformanceProfile }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>What holds you back</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Average area scores vs the targets for your roles</Text>
      {profile.areas.map((a) => {
        const color = ratingColor(a.rating)
        const weakest = a.key === profile.weakestArea
        return (
          <View key={a.key} style={styles.area}>
            <View style={styles.top}>
              <Text style={styles.label} maxFontSizeMultiplier={1.15}>
                {a.label}
                {weakest ? <Text style={styles.tag}>  weakest</Text> : null}
              </Text>
              <Text style={[styles.score, { color }]} maxFontSizeMultiplier={1.15}>
                {a.avgScore ?? '—'}
                <Text style={styles.rating}> {a.rating ?? ''}</Text>
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${a.avgScore ?? 0}%`, backgroundColor: color }]} />
            </View>
            {a.subrows.map((s) => (
              <Text key={s.key} style={styles.subrow} maxFontSizeMultiplier={1.15}>
                {subrowLine(s)}
                {s.n !== a.n ? ` (${s.n} games)` : ''}
              </Text>
            ))}
          </View>
        )
      })}
      <Text style={styles.note} maxFontSizeMultiplier={1.15}>Lane is scored in each Match Review (it needs the timeline). Targets are the average role target over these games.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.xs },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption, marginBottom: space.xs },
  area: { gap: 5, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { color: colors.text, fontSize: font.body - 1, fontWeight: '700' },
  tag: { color: colors.warn, fontSize: font.caption - 1, fontWeight: '700' },
  score: { fontSize: font.body - 1, fontWeight: '800' },
  rating: { fontSize: font.caption - 1, fontWeight: '700', textTransform: 'uppercase' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  subrow: { color: colors.muted, fontSize: font.caption },
  note: { color: colors.muted, fontSize: font.caption - 1, lineHeight: 16, paddingTop: space.sm },
})
