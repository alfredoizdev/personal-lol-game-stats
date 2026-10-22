import { StyleSheet, View } from 'react-native'
import { shareOf } from '@/lib/compare'

// Series colours validated with the dataviz palette checker (see LiveTrendChart).
export const BAR_YOU = '#0E9DB5'
export const BAR_ENEMY = '#E8486F'

/** Two bars growing from the centre: your share to the left (cyan), the enemy's to the right (red). */
export function CompareBar({ me, enemy, lowerIsBetter = false }: { me: number | null; enemy: number | null; lowerIsBetter?: boolean }) {
  const share = shareOf(me, enemy, lowerIsBetter)
  if (!share) return <View style={styles.track} />
  return (
    <View style={styles.track}>
      <View style={styles.half}>
        <View style={[styles.fill, styles.me, { width: `${Math.round(share.me * 100)}%` }]} />
      </View>
      <View style={styles.gap} />
      <View style={[styles.half, { justifyContent: 'flex-start' }]}>
        <View style={[styles.fill, styles.enemy, { width: `${Math.round(share.enemy * 100)}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', height: 4, marginHorizontal: 8 },
  half: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', overflow: 'hidden' },
  gap: { width: 2 },
  fill: { height: 4, borderRadius: 2 },
  me: { backgroundColor: BAR_YOU, alignSelf: 'flex-end' },
  enemy: { backgroundColor: BAR_ENEMY, alignSelf: 'flex-start' },
})
