import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ROLE_LABEL, type Role } from '@lpp/shared'
import { RoleIcon } from '@/components/RoleIcon'
import { colors, font, radius } from '@/theme/tokens'

export const ROLES: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
export { ROLE_LABEL }

/** `best`: the role you win most with (5+ games) gets a small mark, so the row says something before you tap. */
export function RoleChips({ value, onChange, best = null }: { value: Role; onChange: (r: Role) => void; best?: Role | null }) {
  return (
    <View style={styles.row}>
      {ROLES.map((r) => {
        const on = r === value
        return (
          <Pressable key={r} onPress={() => onChange(r)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
            <RoleIcon role={r} size={16} />
            <Text style={[styles.label, on && styles.labelOn]} maxFontSizeMultiplier={1.15}>{ROLE_LABEL[r]}</Text>
            {r === best ? (
              <View style={styles.best} accessibilityLabel="Your best role">
                <Text style={styles.bestText} maxFontSizeMultiplier={1}>★</Text>
              </View>
            ) : null}
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
  best: { position: 'absolute', top: -7, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.win, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  bestText: { color: colors.bg, fontSize: 10, fontWeight: '900', lineHeight: 12 },
})
