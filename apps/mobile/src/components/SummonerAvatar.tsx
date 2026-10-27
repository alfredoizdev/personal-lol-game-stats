import { Image, StyleSheet, Text, View } from 'react-native'
import { profileIconUrl } from '@lpp/shared'
import { useDdragonVersion } from '@/hooks/useDdragonVersion'
import type { LinkedAccount } from '@/lib/linked-account'
import { colors } from '@/theme/tokens'

/** Circular profile icon with a cyan ring and a small "online" dot (mockup 06); with `level`, the summoner level pill sits on the bottom edge instead. Falls back to the initial. */
export function SummonerAvatar({ account, size = 48, level = null }: { account: LinkedAccount; size?: number; level?: number | null }) {
  const version = useDdragonVersion()
  const inner = size - 6
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      {account.profileIconId ? (
        <Image source={{ uri: profileIconUrl(version, account.profileIconId) }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} />
      ) : (
        <View style={[styles.fallback, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          <Text style={styles.initial}>{account.gameName.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      {level === null ? (
        <View style={styles.dot} />
      ) : (
        <View style={styles.level} accessibilityLabel={`level ${level}`}>
          <Text style={styles.levelText} allowFontScaling={false}>{level}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  ring: { borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  fallback: { backgroundColor: colors.surfaceSolid, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.text, fontWeight: '700', fontSize: 18 },
  dot: { position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.win, borderWidth: 2, borderColor: colors.bg },
  level: { position: 'absolute', bottom: -8, alignSelf: 'center', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9, backgroundColor: colors.surfaceSolid, borderWidth: 1, borderColor: colors.border },
  levelText: { color: colors.text, fontSize: 11, fontWeight: '700' },
})
