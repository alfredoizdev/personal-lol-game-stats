import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { AreaKey, AreaResult } from '@lpp/shared'
import { ratingColor } from '@/lib/area-ui'
import { colors, font, radius } from '@/theme/tokens'

/** Farming · Combat · Vision · Lane selector; hidden areas stay tappable so their reason can be read. */
export function AreaPills({ areas, active, onChange }: { areas: AreaResult[]; active: AreaKey; onChange: (k: AreaKey) => void }) {
  return (
    <View style={styles.row}>
      {areas.map((a) => {
        const on = a.key === active
        const color = ratingColor(a.rating)
        return (
          <Pressable
            key={a.key}
            onPress={() => onChange(a.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.pill, on && styles.pillOn, a.score === null && styles.pillHidden]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{a.label}</Text>
            <Text style={[styles.score, { color: a.score === null ? colors.muted : color }]}>{a.score === null ? '—' : a.score}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  pill: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  pillHidden: { opacity: 0.55 },
  label: { color: colors.muted, fontSize: font.caption, fontWeight: '700' },
  labelOn: { color: colors.text },
  score: { fontSize: font.body, fontWeight: '800' },
})
