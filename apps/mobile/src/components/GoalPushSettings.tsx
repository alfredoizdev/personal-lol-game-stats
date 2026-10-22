import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import type { GoalPushMode } from '@lpp/shared'
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs'
import { pushSupported } from '@/lib/push-notifications'
import { colors, font, radius, space } from '@/theme/tokens'

const MODES: Array<{ key: GoalPushMode; label: string; note: string }> = [
  { key: 'change', label: 'Only when my status changes', note: 'On track ↔ Below goal' },
  { key: 'interval', label: 'Every 5 minutes', note: 'Plus any status change' },
]

/** Profile → Notifications: opt-in for goal status pushes sent by the desktop companion during a game. */
export function GoalPushSettings() {
  const { prefs, save, error } = useNotificationPrefs()
  const supported = pushSupported()

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.title}>Goal updates during games</Text>
          <Text style={styles.caption}>Status only — never tips.</Text>
        </View>
        <Switch
          value={prefs.goalPush}
          onValueChange={(v) => save({ ...prefs, goalPush: v })}
          trackColor={{ true: colors.accent, false: colors.border }}
          accessibilityLabel="Goal updates during games"
        />
      </View>
      {prefs.goalPush
        ? MODES.map((m) => {
            const selected = prefs.mode === m.key
            return (
              <Pressable
                key={m.key}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => save({ ...prefs, mode: m.key })}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <View style={styles.rowText}>
                  <Text style={styles.optionLabel}>{m.label}</Text>
                  <Text style={styles.caption}>{m.note}</Text>
                </View>
              </Pressable>
            )
          })
        : null}
      <Text style={styles.caption}>
        Sent by the LanePulse desktop companion while you play: your game time, your goal and where you stand on it.
      </Text>
      {!supported ? <Text style={styles.warn}>This device can't receive pushes here (Expo Go or simulator). Use the LanePulse app build.</Text> : null}
      {error ? <Text style={styles.warn}>Couldn't save: {error.message}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  rowText: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: font.caption },
  warn: { color: colors.warn, fontSize: font.caption },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.control, borderWidth: 1, borderColor: 'transparent' },
  optionSelected: { backgroundColor: colors.accentSoft, borderColor: colors.border },
  optionLabel: { color: colors.text, fontSize: font.body - 1, fontWeight: '600' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.muted },
  radioSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
})
