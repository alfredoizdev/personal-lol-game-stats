import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Role } from '@lpp/shared'
import { RoleIcon } from '@/components/RoleIcon'
import { colors, font, radius } from '@/theme/tokens'

export const ROLES: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
export const ROLE_LABEL: Record<Role, string> = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' }

export function RoleChips({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <View style={styles.row}>
      {ROLES.map((r) => {
        const on = r === value
        return (
          <Pressable key={r} onPress={() => onChange(r)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
            <RoleIcon role={r} size={16} />
            <Text style={[styles.label, on && styles.labelOn]} maxFontSizeMultiplier={1.15}>{ROLE_LABEL[r]}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 8, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  label: { color: colors.muted, fontSize: font.caption - 1, fontWeight: '700' },
  labelOn: { color: colors.text },
})
