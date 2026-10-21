import { Image, StyleSheet, View } from 'react-native'
import { itemIconUrl } from '@lpp/shared'
import { useDdragonVersion } from '@/hooks/useDdragonVersion'
import { colors } from '@/theme/tokens'

export function ItemRow({ items, trinket, size = 26 }: { items: number[]; trinket: number; size?: number }) {
  const version = useDdragonVersion()
  const slots = [...items.slice(0, 6), trinket]
  return (
    <View style={styles.row}>
      {slots.map((id, i) => (
        <View
          key={i}
          style={[styles.slot, { width: size, height: size }, i === 6 && styles.trinket]}
          accessibilityLabel={id ? `Item ${id}` : 'Empty slot'}
        >
          {id ? <Image source={{ uri: itemIconUrl(version, id) }} style={{ width: size - 2, height: size - 2, borderRadius: 5 }} /> : null}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  slot: {
    borderRadius: 6,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trinket: { borderRadius: 999, marginLeft: 2 },
})
