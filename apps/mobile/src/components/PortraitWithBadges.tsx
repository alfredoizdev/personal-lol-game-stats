import { StyleSheet, Text, View } from 'react-native'
import type { Role } from '@lpp/shared'
import { ChampionPortrait } from './ChampionPortrait'
import { RoleIcon } from './RoleIcon'
import { resultLetter, type MatchResult } from '@/lib/result-badge'
import { colors, font, radius } from '@/theme/tokens'

const BADGE_BG: Record<MatchResult, string> = { win: colors.win, loss: colors.loss, remake: colors.muted }

/**
 * Champion portrait with two overlays: a result letter (V / D / R) on the
 * top-left edge and the role icon chip on the bottom edge (hidden when the
 * role is null, e.g. ARAM). Overlay sizes scale with the portrait: at 60 px
 * the badge is ~19 px and the chip ~22 px.
 */
export function PortraitWithBadges({
  championName,
  size,
  ring,
  result,
  role,
}: {
  championName: string
  size: number
  ring: 'win' | 'loss' | 'none'
  result: MatchResult
  role: Role | null
}) {
  const badge = Math.round(size * 0.32)
  const chip = Math.round(size * 0.37)
  return (
    <View style={{ width: size, height: size }}>
      <ChampionPortrait championName={championName} size={size} ring={ring} />
      <View style={[styles.badge, { width: badge, height: badge, backgroundColor: BADGE_BG[result] }]} accessibilityLabel={result}>
        <Text style={[styles.badgeText, { fontSize: Math.max(font.caption - 3, Math.round(badge * 0.55)) }]} allowFontScaling={false}>
          {resultLetter(result)}
        </Text>
      </View>
      {role ? (
        <View style={[styles.chip, { width: chip, height: chip, marginLeft: -chip / 2, bottom: -Math.round(chip * 0.3) }]}>
          <RoleIcon role={role} size={Math.round(chip * 0.6)} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    left: -2,
    borderWidth: 2,
    borderColor: colors.bg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.text, fontWeight: '800' },
  chip: {
    position: 'absolute',
    left: '50%',
    borderWidth: 2,
    borderColor: colors.bg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
