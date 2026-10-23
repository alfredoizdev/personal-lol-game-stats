import { Image, StyleSheet, Text, View } from 'react-native'
import { profileIconUrl } from '@lpp/shared'
import { useDdragonVersion } from '@/hooks/useDdragonVersion'
import type { LinkedAccount } from '@/lib/linked-account'
import { colors } from '@/theme/tokens'

/** Circular profile icon with a cyan ring and a small "online" dot (mockup 06). Falls back to the initial. */
export function SummonerAvatar({ account, size = 48 }: { account: LinkedAccount; size?: number }) {
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
      <View style={styles.dot} />
    </View>
  )
}

const styles = StyleSheet.create({
  ring: { borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  fallback: { backgroundColor: colors.surfaceSolid, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.text, fontWeight: '700', fontSize: 18 },
  dot: { position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.win, borderWidth: 2, borderColor: colors.bg },
})
