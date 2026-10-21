import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, font, radius } from '@/theme/tokens'

export function PrimaryButton({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dim]}
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
    >
      {busy ? <ActivityIndicator color={colors.text} /> : <Text style={styles.text}>{label}  →</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.control + 2,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  dim: { opacity: 0.8 },
  text: { color: colors.text, fontSize: font.body, fontWeight: '700' },
})
