import { StyleSheet, Text, View } from 'react-native'
import { RECENT_FORM_N, type RecentSnapshot } from '@lpp/shared'
import { RoleIcon } from '@/components/RoleIcon'
import { SemiDonut } from '@/components/SemiDonut'
import { ratingColor } from '@/lib/area-ui'
import type { HeaderDonut } from '@/lib/header-donuts'
import { mainRoleLine, recordLine } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

const DONUT = 84

/**
 * "Last 20 games" (owner, 2026-10-27, after "está muy complicado"): the same two arcs the
 * Matches header uses — win rate and KDA, each with its rating word — one plain line under
 * each saying where the number comes from, and the main role as a sentence. Nothing twice.
 */
export function RecentCard({ snapshot, donuts }: { snapshot: RecentSnapshot; donuts: HeaderDonut[] }) {
  const winRate = donuts.find((d) => d.key === 'winRate')
  const kda = donuts.find((d) => d.key === 'kda')
  const n = snapshot.games
  const title = n >= RECENT_FORM_N ? `Last ${RECENT_FORM_N} games` : n === 1 ? 'Last game' : `Last ${n} games`
  const role = mainRoleLine(snapshot.mainRole, n)
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>{title}</Text>
      <View style={styles.arcs}>
        {winRate ? <Arc donut={winRate} caption={recordLine(snapshot)} /> : null}
        {kda ? <Arc donut={kda} caption="kills + assists per death" /> : null}
      </View>
      {role && snapshot.mainRole ? (
        <View style={styles.roleRow}>
          <RoleIcon role={snapshot.mainRole.role} size={18} />
          <Text style={styles.role} maxFontSizeMultiplier={1.15}>{role}</Text>
        </View>
      ) : null}
    </View>
  )
}

function Arc({ donut, caption }: { donut: HeaderDonut; caption: string }) {
  const color = ratingColor(donut.rating)
  return (
    <View style={styles.arc} accessibilityLabel={`${donut.label} ${donut.display}, ${donut.rating ?? 'no rating'}, ${caption}`}>
      <SemiDonut score={donut.score} size={DONUT} color={color} text={donut.display} />
      <Text style={styles.label} maxFontSizeMultiplier={1.15}>{donut.label === 'Avg KDA' ? 'KDA' : donut.label}</Text>
      <Text style={[styles.rating, { color }]} maxFontSizeMultiplier={1.15}>{donut.rating ?? '—'}</Text>
      <Text style={styles.caption} maxFontSizeMultiplier={1.15} numberOfLines={2}>{caption}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  arcs: { flexDirection: 'row', alignItems: 'flex-start' },
  arc: { flex: 1, alignItems: 'center', gap: 2 },
  label: { color: colors.text, fontSize: font.caption + 1, fontWeight: '700', marginTop: 4 },
  rating: { fontSize: font.caption - 1, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  caption: { color: colors.muted, fontSize: font.caption - 1, textAlign: 'center', marginTop: 2 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  role: { color: colors.muted, fontSize: font.caption + 1 },
})
