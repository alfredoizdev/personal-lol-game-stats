import { useState } from 'react'
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { GOAL_METRICS, formatStoredGoal, metricInfo, type GoalMetric, type StoredGoal } from '@lpp/shared'
import { stepTarget } from '@/lib/goal-steps'
import { colors, font, radius, space } from '@/theme/tokens'

/**
 * "Your goal for every game": one metric, either the recommended value for
 * whatever role you end up playing (default) or a fixed number. Applies when
 * no champion- or role-specific goal matches the game (autofill, a last-second
 * pick, a mode without positions).
 */
export function StandingGoalEditor({ goals, onSave, saving }: { goals: StoredGoal[]; onSave: (g: Omit<StoredGoal, 'setAt' | 'puuid'>) => Promise<void>; saving: boolean }) {
  const current = goals.filter((g) => g.role === 'ANY').sort((a, b) => Date.parse(b.setAt) - Date.parse(a.setAt))[0] ?? null
  const [metric, setMetric] = useState<GoalMetric>(current?.metric ?? 'csPerMin')
  const [recommended, setRecommended] = useState(current ? current.target === null : true)
  const [target, setTarget] = useState<number>(current?.target ?? 7)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const info = metricInfo(metric)
  const fmt = (v: number) => `${v.toFixed(info.decimals)}${metric === 'kpPct' ? '%' : ''}`

  return (
    <View style={styles.block}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Your goal for every game</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Used whenever the game does not match a champion or role goal below: autofill, a late pick, a mode without positions.</Text>
      <View style={styles.chips}>
        {GOAL_METRICS.map((m) => (
          <Pressable key={m.key} onPress={() => { setMetric(m.key); setSaved(null) }} accessibilityRole="radio" accessibilityState={{ selected: metric === m.key }} style={[styles.chip, metric === m.key && styles.chipOn]}>
            <Text style={[styles.chipText, metric === m.key && styles.chipTextOn]} maxFontSizeMultiplier={1.15}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.label} maxFontSizeMultiplier={1.15}>Recommended for my role</Text>
          <Text style={styles.caption} maxFontSizeMultiplier={1.15}>The target the match score uses for the role you play</Text>
        </View>
        <Switch value={recommended} onValueChange={(v) => { setRecommended(v); setSaved(null) }} trackColor={{ true: colors.accent, false: colors.border }} accessibilityLabel="Recommended for my role" />
      </View>
      {!recommended ? (
        <View style={styles.stepper}>
          <Pressable onPress={() => { setTarget((t) => stepTarget(metric, t, -1)); setSaved(null) }} accessibilityRole="button" accessibilityLabel="Lower" style={styles.stepBtn}><Text style={styles.stepText}>−</Text></Pressable>
          <Text style={styles.value} maxFontSizeMultiplier={1.15}>{info.lowerIsBetter ? '≤ ' : ''}{fmt(target)}{info.unit}</Text>
          <Pressable onPress={() => { setTarget((t) => stepTarget(metric, t, 1)); setSaved(null) }} accessibilityRole="button" accessibilityLabel="Raise" style={styles.stepBtn}><Text style={styles.stepText}>+</Text></Pressable>
        </View>
      ) : null}
      {current ? <Text style={styles.caption} maxFontSizeMultiplier={1.15}>Current: {formatStoredGoal(current)}</Text> : null}
      <Pressable
        disabled={saving}
        onPress={() => {
          setError(null)
          const g = { championId: 0, role: 'ANY' as const, metric, target: recommended ? null : target }
          onSave(g)
            .then(() => setSaved(formatStoredGoal(g)))
            .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not save the goal'))
        }}
        accessibilityRole="button"
        style={[styles.save, saving && styles.saveOff]}
      >
        <Text style={styles.saveText} maxFontSizeMultiplier={1.15}>{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save for every game'}</Text>
      </Pressable>
      {saved ? <Text style={styles.savedLine} maxFontSizeMultiplier={1.15}>Goal saved · {saved} · applies to every game</Text> : null}
      {error ? <Text style={styles.error} maxFontSizeMultiplier={1.15}>Couldn't save: {error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.muted, fontSize: font.caption + 1, fontWeight: '600' },
  chipTextOn: { color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  rowText: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: font.body - 1, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: font.caption },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepText: { color: colors.text, fontSize: 24, fontWeight: '700', lineHeight: 28 },
  value: { color: colors.text, fontSize: font.body + 4, fontWeight: '800', flex: 1, textAlign: 'center' },
  save: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent, borderRadius: radius.control, paddingVertical: 12, alignItems: 'center' },
  saveOff: { opacity: 0.5 },
  saveText: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  savedLine: { color: colors.win, fontSize: font.caption + 1, fontWeight: '600' },
  error: { color: colors.loss, fontSize: font.caption + 1 },
})
