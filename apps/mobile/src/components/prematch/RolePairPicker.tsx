import { StyleSheet, Text, View } from 'react-native'
import type { Role } from '@lpp/shared'
import type { RolePair } from '@/lib/prematch-roles'
import { colors, font, space } from '@/theme/tokens'
import { RoleChips } from './RoleChips'

/** The two roles you queue with, as in the client. Either may be assigned; Prepare covers both. */
export function RolePairPicker({ value, onChange }: { value: RolePair; onChange: (pair: RolePair) => void }) {
  const set = (key: keyof RolePair) => (r: Role) => onChange({ ...value, [key]: r })
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Your roles</Text>
      <Text style={styles.label} maxFontSizeMultiplier={1.15}>Primary</Text>
      <RoleChips value={value.primary} onChange={set('primary')} />
      <Text style={styles.label} maxFontSizeMultiplier={1.15}>Secondary</Text>
      <RoleChips value={value.secondary} onChange={set('secondary')} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  title: { color: colors.text, fontSize: font.body, fontWeight: '800', marginBottom: 2 },
  label: { color: colors.muted, fontSize: font.caption, fontWeight: '700', marginTop: 4 },
})
