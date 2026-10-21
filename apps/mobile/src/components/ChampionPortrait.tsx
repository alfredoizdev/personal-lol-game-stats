import { Image, StyleSheet, View } from 'react-native'
import { championIconUrl } from '@lpp/shared'
import { useDdragonVersion } from '@/hooks/useDdragonVersion'
import { colors } from '@/theme/tokens'

const RING: Record<'win' | 'loss' | 'you' | 'enemy' | 'none', string> = {
  win: colors.win,
  loss: colors.loss,
  you: colors.you,
  enemy: colors.enemy,
  none: colors.border,
}

export function ChampionPortrait({
  championName,
  size = 56,
  ring = 'none',
}: {
  championName: string
  size?: number
  ring?: keyof typeof RING
}) {
  const version = useDdragonVersion()
  const inner = size - 6
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: RING[ring] }]}>
      <Image
        source={{ uri: championIconUrl(version, championName) }}
        style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.surfaceSolid }}
        accessibilityLabel={championName}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  ring: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', padding: 1 },
})
