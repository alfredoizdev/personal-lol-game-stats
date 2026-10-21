import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { REGIONS, type Region } from '@lpp/shared'
import { colors, font, space } from '@/theme/tokens'

export function RegionPicker({ value, onChange }: { value: Region; onChange: (r: Region) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {REGIONS.map((r) => {
        const selected = r === value
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{r}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: space.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  label: { color: colors.text, fontSize: font.caption + 2, fontWeight: '600' },
  labelSelected: { color: colors.text },
})
