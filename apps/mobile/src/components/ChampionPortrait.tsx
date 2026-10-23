import { Image, StyleSheet, Text, View } from 'react-native'
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
  respawnIn = null,
}: {
  championName: string
  size?: number
  ring?: keyof typeof RING
  /** Seconds until respawn while dead: the portrait greys out and shows the countdown, like the in-game timer. */
  respawnIn?: number | null
}) {
  const version = useDdragonVersion()
  const inner = size - 6
  const dead = respawnIn !== null
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: dead ? colors.muted : RING[ring] }]}>
      <Image
        source={{ uri: championIconUrl(version, championName) }}
        style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.surfaceSolid, opacity: dead ? 0.35 : 1 }}
        accessibilityLabel={dead ? `${championName}, dead, respawns in ${respawnIn} seconds` : championName}
      />
      {dead ? (
        <View style={[StyleSheet.absoluteFill, styles.deadOverlay]} pointerEvents="none">
          <Text style={[styles.respawn, { fontSize: Math.round(size * 0.42) }]} maxFontSizeMultiplier={1}>{respawnIn}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  ring: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', padding: 1 },
  deadOverlay: { alignItems: 'center', justifyContent: 'center' },
  respawn: { color: colors.text, fontWeight: '900', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
})
