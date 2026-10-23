import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GOAL_METRICS, defaultGoal, defaultMetricFor, formatGoal, goalFor, goalReference, metricInfo, type GoalMetric, type MatchSummary, type Role, type StoredGoal } from '@lpp/shared'
import { GoalReference } from './GoalReference'
import { stepTarget } from '@/lib/goal-steps'
import { goalSaveState } from '@/lib/prematch-ui'
import { goalEditorMode, standingTarget } from '@/lib/prepare-view'
import { colors, font, radius, space } from '@/theme/tokens'

const roleWordOf = (role: Role) => (role === 'UTILITY' ? 'support' : role.toLowerCase())

/**
 * The one goal editor (owner, 2026-10-23: one place to set the goal, easy to use).
 * Metric, target (stepper) and Save. The goal is for EVERY game: left at the
 * recommended value it is stored as "recommended for the role you play" and
 * resolved at game time; moved, it is a fixed number. `role` is the role Prepare
 * is showing (champion select's, else yours), so the recommended value and your
 * average match what you are about to play.
 */
export function GoalEditor({
  summaries,
  goals,
  puuid,
  role,
  onSave,
  saving,
}: {
  summaries: MatchSummary[]
  goals: StoredGoal[]
  puuid: string
  role: Role
  onSave: (g: Omit<StoredGoal, 'setAt' | 'puuid'>) => Promise<void>
  saving: boolean
}) {
  const standing = goals.filter((g) => g.puuid === puuid && g.role === 'ANY').sort((a, b) => Date.parse(b.setAt) - Date.parse(a.setAt))[0] ?? null
  const current = goalFor(goals, puuid, null, role)
  const [metric, setMetric] = useState<GoalMetric>(() => standing?.metric ?? defaultGoal(summaries, 0, role).metric)
  const suggested = defaultGoal(summaries, 0, role, metric)
  const fixed = standing && standing.metric === metric && standing.target !== null ? standing.target : null
  const [target, setTarget] = useState<number | null>(() => fixed ?? suggested.target)
  const [touched, setTouched] = useState(false)
  const [savedGoal, setSavedGoal] = useState<{ metric: GoalMetric; target: number | null } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const lastSuggested = useRef(suggested.target)

  // Changing the metric starts from the saved fixed number for it, else the recommended value.
  useEffect(() => {
    setTarget(fixed ?? defaultGoal(summaries, 0, role, metric).target)
    setTouched(false)
  }, [metric])

  // The recommended value moves with the role champion select assigns (and while the history loads): follow it until the player touches the stepper.
  useEffect(() => {
    if (suggested.target !== lastSuggested.current) {
      lastSuggested.current = suggested.target
      if (!touched && fixed === null) setTarget(suggested.target)
    }
  }, [suggested.target, touched, fixed])

  const info = metricInfo(metric)
  const roleWord = roleWordOf(role)
  const fmt = (v: number) => `${v.toFixed(info.decimals)}${metric === 'kpPct' ? '%' : ''}`
  const average = suggested.average
  // CS is not scored for support: with nothing fixed, the support goal is the role's own recommended metric (vision).
  const mode = goalEditorMode({ recommended: suggested.target, fixed })
  const fallback = mode === 'fallback' ? defaultGoal(summaries, 0, role, defaultMetricFor(role)) : null
  const source =
    fallback && fallback.target !== null
      ? `${info.label} is not scored for ${roleWord}, so as ${roleWord} your goal is the recommended ${metricInfo(fallback.metric).label.toLowerCase()}` +
        (fallback.average ? ` · your ${roleWord} average: ${fallback.average.value.toFixed(metricInfo(fallback.metric).decimals)} (${fallback.average.n} games)` : '')
      : suggested.source === 'none'
        ? `No recommended ${info.label} for ${roleWord} — set it by hand or pick another metric`
        : `Recommended: the ${roleWord} target the match score uses` + (average ? ` · your ${roleWord} average: ${fmt(average.value)} (${average.n} games)` : ` · no ${roleWord} games of yours loaded yet`)
  const stored = fallback ? null : target === null ? null : standingTarget(target, suggested.target)
  const canSave = !saving && (fallback !== null || target !== null)
  const saveState = goalSaveState(savedGoal, { metric, target: stored })
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
      {fallback ? (
        <Text style={styles.value} maxFontSizeMultiplier={1.15}>{fallback.target === null ? '—' : formatGoal({ metric: fallback.metric, target: fallback.target })}</Text>
      ) : (
        <View style={styles.stepper}>
          <Pressable onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel="Decrease" style={styles.stepBtn}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.value} maxFontSizeMultiplier={1.15}>{target === null ? '—' : formatGoal({ metric, target })}</Text>
          <Pressable onPress={() => step(1)} accessibilityRole="button" accessibilityLabel="Increase" style={styles.stepBtn}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      )}
      <Text style={styles.source} maxFontSizeMultiplier={1.15}>{source}</Text>
      {fallback ? null : <GoalReference metric={metric} role={role} reference={goalReference(summaries, 0, role, metric)} target={target} />}
      {current ? (
        <Text style={styles.source} maxFontSizeMultiplier={1.15}>
          Current goal as {roleWord}: {formatGoal(current)}{current.source === 'standing' && standing?.target === null ? ' (recommended for the role you play)' : ''}
        </Text>
      ) : null}
      <Pressable
        disabled={!canSave}
        onPress={() => {
          if (!canSave) return
          setSaveError(null)
          const g = { championId: 0, role: 'ANY' as const, metric, target: stored }
          onSave(g)
            .then(() => setSavedGoal({ metric, target: stored }))
            .catch((e: unknown) => setSaveError(e instanceof Error ? e.message : 'Could not save the goal'))
        }}
        accessibilityRole="button"
        style={[styles.save, !canSave && styles.saveOff]}
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
        Shows on the Live tab whatever role you get, and is checked in the match review. Leave the recommended value and it adapts to the role; move it and that number applies. Step {info.step}{info.unit.trim()}.
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
