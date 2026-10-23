import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GOAL_METRICS, defaultGoal, formatGoal, goalFor, goalReference, metricInfo, type Goal, type GoalMetric, type MatchSummary, type Role } from '@lpp/shared'
import { GoalReference } from './GoalReference'
import { stepTarget } from '@/lib/goal-steps'
import { goalSaveState } from '@/lib/prematch-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/**
 * One measurable goal for the next game: metric, target (stepper) and Save.
 * The default and where it came from are always stated (spec 2.4).
 * Mounted with `key={champion:role}` by the parent, so a new champion or role
 * starts from the saved goal for it (else the default) and never keeps stale state.
 */
export function GoalEditor({
  summaries,
  goals,
  puuid,
  championId,
  championName,
  role,
  onSave,
  saving,
}: {
  summaries: MatchSummary[]
  goals: Goal[]
  puuid: string
  championId: number
  championName: string
  role: Role
  onSave: (g: Omit<Goal, 'setAt' | 'puuid'>) => Promise<void>
  saving: boolean
}) {
  const current = goalFor(goals, puuid, championId, role)
  const exact = current && current.championId === championId ? current : null
  const [metric, setMetric] = useState<GoalMetric>(() => exact?.metric ?? defaultGoal(summaries, championId, role).metric)
  const suggested = defaultGoal(summaries, championId, role, metric)
  const [target, setTarget] = useState<number | null>(() => (exact?.metric === metric ? exact.target : suggested.target))
  const [touched, setTouched] = useState(false)
  const [savedGoal, setSavedGoal] = useState<{ metric: GoalMetric; target: number } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const lastSuggested = useRef(suggested.target)

  // Changing the metric starts from the saved goal for it, else the default.
  useEffect(() => {
    setTarget(exact && exact.metric === metric ? exact.target : defaultGoal(summaries, championId, role, metric).target)
    setTouched(false)
  }, [metric])

  // While the history is still loading, follow the moving default until the player touches the stepper.
  useEffect(() => {
    if (suggested.target !== lastSuggested.current) {
      lastSuggested.current = suggested.target
      if (!touched && !(exact && exact.metric === metric)) setTarget(suggested.target)
    }
  }, [suggested.target, touched, exact, metric])

  const info = metricInfo(metric)
  const source =
    suggested.source === 'champion'
      ? `Default: your average with ${championName} (${suggested.n} games)`
      : suggested.source === 'role'
        ? `Default: your ${role === 'UTILITY' ? 'support' : role.toLowerCase()} average (${suggested.n} games)`
        : suggested.source === 'target'
          ? 'Default: the target for your role'
          : 'No default for this metric in this role — set it by hand'
  const saveState = goalSaveState(savedGoal, { metric, target })
  const step = (dir: 1 | -1) => {
    setTouched(true)
    setSaveError(null)
    setTarget((t) => stepTarget(metric, t ?? 0, dir))
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Personal goal</Text>
      <View style={styles.metrics}>
        {GOAL_METRICS.map((m) => {
          const on = m.key === metric
          return (
            <Pressable key={m.key} onPress={() => setMetric(m.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.metric, on && styles.metricOn]}>
              <Text style={[styles.metricText, on && styles.metricTextOn]} maxFontSizeMultiplier={1.15}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <View style={styles.stepper}>
        <Pressable onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel="Decrease" style={styles.stepBtn}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.value} maxFontSizeMultiplier={1.15}>{target === null ? '—' : formatGoal({ metric, target })}</Text>
        <Pressable onPress={() => step(1)} accessibilityRole="button" accessibilityLabel="Increase" style={styles.stepBtn}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.source} maxFontSizeMultiplier={1.15}>{source}</Text>
      <GoalReference metric={metric} role={role} reference={goalReference(summaries, championId, role, metric)} target={target} />
      {current ? (
        <Text style={styles.source} maxFontSizeMultiplier={1.15}>
          Current goal{current.championId === championId ? '' : ' (any champion in this role)'}: {formatGoal(current)}
        </Text>
      ) : null}
      <Pressable
        disabled={target === null || saving}
        onPress={() => {
          if (target === null) return
          setSaveError(null)
          onSave({ championId, role, metric, target })
            .then(() => setSavedGoal({ metric, target }))
            .catch((e: unknown) => setSaveError(e instanceof Error ? e.message : 'Could not save the goal'))
        }}
        accessibilityRole="button"
        style={[styles.save, (target === null || saving) && styles.saveOff]}
      >
        <Text style={styles.saveText} maxFontSizeMultiplier={1.15}>{saving ? 'Saving…' : saveState?.kind === 'saved' ? 'Saved ✓' : 'Save goal'}</Text>
      </Pressable>
      {saveError ? <Text style={styles.error} maxFontSizeMultiplier={1.15}>Couldn't save: {saveError}</Text> : null}
      {saveState ? (
        <Text style={saveState.kind === 'saved' ? styles.savedLine : styles.source} maxFontSizeMultiplier={1.15}>
          {saveState.line}
        </Text>
      ) : null}
      <Text style={styles.hint} maxFontSizeMultiplier={1.15}>
        Shows on the Live tab when you play {championName} as {role === 'UTILITY' ? 'support' : role.toLowerCase()}, and is checked in the match review. Step {info.step}{info.unit.trim()}.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  title: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metric: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface },
  metricOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  metricText: { color: colors.muted, fontSize: font.caption, fontWeight: '700' },
  metricTextOn: { color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.text, fontSize: 24, lineHeight: 26, fontWeight: '700' },
  value: { color: colors.text, fontSize: font.body + 3, fontWeight: '800', flex: 1, textAlign: 'center' },
  source: { color: colors.muted, fontSize: font.caption },
  savedLine: { color: colors.win, fontSize: font.caption + 1, fontWeight: '600' },
  save: { backgroundColor: colors.accent, borderRadius: radius.control, paddingVertical: 12, alignItems: 'center' },
  saveOff: { opacity: 0.5 },
  saveText: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  error: { color: colors.warn, fontSize: font.caption },
  hint: { color: colors.muted, fontSize: font.caption - 1, lineHeight: 17 },
})
