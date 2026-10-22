import { StyleSheet, Text, View } from 'react-native'
import type { RecentGame } from '@lpp/shared'
import { barHeight } from '@/lib/performance-ui'
import { colors, font } from '@/theme/tokens'

const MAX = 36

/** Last games as bars: height = match score, colour = result, oldest on the left (spec 2.3). */
export function RecentStrip({ recent }: { recent: RecentGame[] }) {
  if (recent.length === 0) return null
  return (
    <View style={styles.wrap}>
      <View style={styles.bars} accessibilityLabel={`Last ${recent.length} games, oldest to newest`}>
        {recent.map((g) => (
          <View key={g.matchId} style={styles.slot}>
            <View style={[styles.bar, { height: barHeight(g.score, MAX), backgroundColor: g.win ? colors.win : colors.loss }]} />
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={styles.caption} maxFontSizeMultiplier={1.15}>Last {recent.length} games · oldest → newest</Text>
        <Text style={styles.caption} maxFontSizeMultiplier={1.15}>height = match score</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: MAX, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: { color: colors.muted, fontSize: font.caption - 2 },
})
