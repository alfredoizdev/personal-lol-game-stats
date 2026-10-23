import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { formatRiotId, profileIconUrl } from '@lpp/shared'
import { useDdragonVersion } from '@/hooks/useDdragonVersion'
import type { LinkedAccount } from '@/lib/linked-account'
import { colors, font, radius, space } from '@/theme/tokens'

export function AccountCard({
  account,
  active,
  onPress,
}: {
  account: LinkedAccount
  active: boolean
  onPress?: () => void
}) {
  const version = useDdragonVersion()
  const initial = account.gameName.slice(0, 1).toUpperCase()
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}
    >
      <View style={[styles.avatarRing, active && styles.avatarRingActive]}>
        {account.profileIconId ? (
          <Image source={{ uri: profileIconUrl(version, account.profileIconId) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.name}>{formatRiotId(account.gameName, account.tagLine)}</Text>
        <Text style={styles.meta}>{account.region}</Text>
      </View>
      {active ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Active</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActive: { borderColor: colors.accent },
  pressed: { opacity: 0.85 },
  avatarRing: { padding: 2, borderRadius: 999, borderWidth: 2, borderColor: colors.border },
  avatarRingActive: { borderColor: colors.you },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { backgroundColor: colors.surfaceSolid, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.text, fontSize: 20, fontWeight: '700' },
  textBlock: { flex: 1 },
  name: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: font.caption, marginTop: 2 },
  badge: { backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.accent, fontSize: font.caption, fontWeight: '700' },
})
