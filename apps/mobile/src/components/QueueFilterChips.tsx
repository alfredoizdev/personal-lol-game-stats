import { Pressable, StyleSheet, Text, View } from 'react-native'
import { QUEUE_FILTER_LABEL, QUEUE_FILTERS, type QueueFilter } from '@lpp/shared'
import { colors, font, radius } from '@/theme/tokens'

/** All · Ranked · Normal. One choice for Matches and Performance (owner, 2026-10-27). */
export function QueueFilterChips({ value, onChange }: { value: QueueFilter; onChange: (f: QueueFilter) => void }) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {QUEUE_FILTERS.map((f) => {
        const on = f === value
        return (
          <Pressable key={f} onPress={() => onChange(f)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.label, on && styles.labelOn]} maxFontSizeMultiplier={1.15}>{QUEUE_FILTER_LABEL[f]}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  label: { color: colors.muted, fontSize: font.caption, fontWeight: '700' },
  labelOn: { color: colors.text },
})
