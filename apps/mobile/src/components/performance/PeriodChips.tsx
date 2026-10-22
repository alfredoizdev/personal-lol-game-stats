import { Pressable, StyleSheet, Text, View } from 'react-native'
import { PERIODS, type Period } from '@lpp/shared'
import { periodLabel } from '@/lib/performance-ui'
import { colors, font, radius } from '@/theme/tokens'

/** Last 20 · Last 50 · All loaded (spec 2.2). */
export function PeriodChips({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <View style={styles.row}>
      {PERIODS.map((p) => {
        const on = p === value
        return (
          <Pressable key={p} onPress={() => onChange(p)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.label, on && styles.labelOn]} maxFontSizeMultiplier={1.15}>{periodLabel(p)}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  label: { color: colors.muted, fontSize: font.caption, fontWeight: '700' },
  labelOn: { color: colors.text },
})
