import { StyleSheet, Text, View } from 'react-native'
import { IMPACT_MIN_SEC, liveImpact, type LiveSnapshotV2 } from '@lpp/shared'
import { SemiDonut } from '@/components/SemiDonut'
import { colors, font, radius, space } from '@/theme/tokens'

const DONUT = 128
const RED_TRACK = 'rgba(251, 92, 122, 0.45)'

/**
 * "Your impact" (owner, 2026-10-28): one arc of what you bring to this game, green filled,
 * red for the rest, and the four areas it is made of as chips — green at the role target,
 * red below. Same targets and curve as the match score. Statements, never advice.
 */
export function ImpactCard({ snapshot }: { snapshot: LiveSnapshotV2 }) {
  const impact = liveImpact(snapshot)
  const early = impact.score === null && impact.areas.length === 0
  return (
    <View style={styles.card} accessibilityLabel={impact.score === null ? 'Your impact: not yet' : `Your impact ${impact.score}, ${impact.rating}`}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Your impact</Text>
      <View style={styles.donutWrap}>
        <SemiDonut score={impact.score} size={DONUT} color={colors.win} trackColor={RED_TRACK} text={impact.score === null ? '—' : String(impact.score)} />
        <Text style={[styles.rating, { color: impact.rating ? colors.win : colors.muted }]} maxFontSizeMultiplier={1.15}>
          {impact.rating ?? (early ? `From minute ${IMPACT_MIN_SEC / 60}` : '—')}
        </Text>
      </View>
      {impact.areas.length ? (
        <View style={styles.chips}>
          {impact.areas.map((a) => {
            const tone = a.onTarget === null ? colors.muted : a.onTarget ? colors.win : colors.loss
            return (
              <View key={a.key} style={[styles.chip, { borderColor: tone }]} accessibilityLabel={`${a.label}: ${a.value}${a.onTarget === null ? '' : a.onTarget ? ', on target' : ', below target'}`}>
                <Text style={[styles.chipLabel, { color: tone }]} maxFontSizeMultiplier={1.15}>{a.label}</Text>
                <Text style={styles.chipValue} maxFontSizeMultiplier={1.15} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{a.value}</Text>
              </View>
            )
          })}
        </View>
      ) : null}
      <Text style={styles.foot} maxFontSizeMultiplier={1.15}>Green: at your role's target. Red: below it. Fights, farm, objectives and vision, weighted like the match score.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  donutWrap: { alignItems: 'center', gap: 2 },
  rating: { fontSize: font.caption, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: radius.control, paddingVertical: 6, paddingHorizontal: 10, gap: 1 },
  chipLabel: { fontSize: font.caption - 1, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  chipValue: { color: colors.text, fontSize: font.caption + 1, fontWeight: '700' },
  foot: { color: colors.muted, fontSize: font.caption - 1, lineHeight: 16 },
})
