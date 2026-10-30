import { StyleSheet, Text, View } from 'react-native'
import { ratingColor } from '@/lib/area-ui'
import type { HeaderDonut } from '@/lib/header-donuts'
import { SemiDonut } from './SemiDonut'
import { colors, font, radius, space } from '@/theme/tokens'

const DONUT_SIZE = 76

function Stat({ donut }: { donut: HeaderDonut }) {
  const color = ratingColor(donut.rating)
  return (
    <View style={styles.stat}>
      <SemiDonut score={donut.score} size={DONUT_SIZE} color={color} text={donut.display} />
      <Text style={styles.label} maxFontSizeMultiplier={1.15}>{donut.label}</Text>
      <Text style={[styles.rating, { color }]} maxFontSizeMultiplier={1.15}>{donut.rating ?? '—'}</Text>
    </View>
  )
}

/** "Last 10 Games" card on the Matches tab: one semi-donut per header stat, rated like the area cards. */
export function PerformanceHeader({ games, donuts, mostPlayed = null }: { games: number; donuts: HeaderDonut[]; /** "Most played · Vel'Koz 13 games · Kindred 3 games" (owner, 2026-10-30: champions as one line, not a card). */ mostPlayed?: string | null }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Last {games || 10} Games</Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.15}>Recent form · your full picture is in Performance</Text>
      <View style={styles.row}>
        {donuts.map((d) => <Stat key={d.key} donut={d} />)}
      </View>
      {mostPlayed ? <Text style={styles.mostPlayed} maxFontSizeMultiplier={1.15}>{mostPlayed}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  mostPlayed: { color: colors.muted, fontSize: font.caption + 1, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: 2 },
  title: { color: colors.text, fontSize: font.body + 4, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: font.caption + 1, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  label: { color: colors.muted, fontSize: font.caption, marginTop: 4 },
  rating: { fontSize: font.caption - 1, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
})
