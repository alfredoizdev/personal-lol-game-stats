import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  GOAL_METRICS,
  defaultGoal,
  formatGoal,
  goalFor,
  goalReference,
  metricInfo,
  recommendedGoal,
  ROLE_LABEL,
  ROLES,
  roleGoalRows,
  roleTargetFor,
  type GoalMetric,
  type MatchSummary,
  type Role,
  type RoleGoalRow,
  type StoredGoal,
} from '@lpp/shared'
import { GoalReference } from './GoalReference'
import { stepTarget } from '@/lib/goal-steps'
import { goalSaveState } from '@/lib/prematch-ui'
import { goalEditorInitial, standingTarget } from '@/lib/prepare-view'
import { colors, font, radius, space } from '@/theme/tokens'

const roleWordOf = (role: Role) => (role === 'UTILITY' ? 'support' : role.toLowerCase())
const fmtValue = (metric: GoalMetric, v: number) => `${v.toFixed(metricInfo(metric).decimals)}${metric === 'kpPct' ? '%' : ''}`

/** The number the stepper starts from: the shown role's target, else the first role that has one. */
function startTarget(metric: GoalMetric, role: Role): number {
  return roleTargetFor(role, metric) ?? ROLES.map((r) => roleTargetFor(r, metric)).find((t): t is number => t !== null) ?? 0
}

/**
 * The one goal editor (owner, 2026-10-27: simpler — you pick the metric, the
 * number follows the role, Save right under it). Chips for the four metrics;
 * one line with the number for the role Prepare is showing (recommended = that
 * role's target, or a number you fix for every role); a one-line suggestion
 * naming your weakest metric in that role, tap to pick it; Save; the reference
 * ruler last. Save writes the standing row plus one row per role.
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
  onSave: (g: Omit<StoredGoal, 'setAt' | 'puuid'>, rows: RoleGoalRow[]) => Promise<void>
  saving: boolean
}) {
  const standing = goals.filter((g) => g.puuid === puuid && g.role === 'ANY').sort((a, b) => Date.parse(b.setAt) - Date.parse(a.setAt))[0] ?? null
  const initial = goalEditorInitial(standing, role)
  const [metric, setMetric] = useState<GoalMetric>(initial.metric)
  const recommended = roleTargetFor(role, metric)
  const [target, setTarget] = useState<number>(initial.target ?? startTarget(initial.metric, role))
  const [touched, setTouched] = useState(initial.target !== null)
  const [savedGoal, setSavedGoal] = useState<{ metric: GoalMetric; target: number | null } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const lastRecommended = useRef(recommended)

  // Left at the recommended value, the number follows the role Prepare shows (champion select assigns it).
  useEffect(() => {
    if (recommended !== lastRecommended.current) {
      lastRecommended.current = recommended
      if (!touched && recommended !== null) setTarget(recommended)
    }
  }, [recommended, touched])

  const info = metricInfo(metric)
  const roleWord = roleWordOf(role)
  const unscored = recommended === null
  const average = useMemo(() => defaultGoal(summaries, 0, role, metric).average, [summaries, role, metric])
  const suggestion = useMemo(() => recommendedGoal(summaries, role), [summaries, role])
  const stored = { metric, target: unscored ? (touched ? target : null) : standingTarget(target, recommended) }
  const saveState = goalSaveState(savedGoal, stored)
  const current = goalFor(goals, puuid, null, role)

  const pickMetric = (m: GoalMetric) => {
    setMetric(m)
    const fixed = standing && standing.metric === m && standing.target !== null ? standing.target : null
    setTarget(fixed ?? startTarget(m, role))
    setTouched(fixed !== null)
    lastRecommended.current = roleTargetFor(role, m)
    setSaveError(null)
  }
  const step = (dir: 1 | -1) => {
    setTouched(true)
    setSaveError(null)
    setTarget((t) => stepTarget(metric, t, dir))
  }

  const sourceLine = unscored
    ? `${info.label} is not scored for ${roleWord}: as ${roleWord} your goal is the recommended ${metricInfo(suggestion.metric).label.toLowerCase()} (${fmtValue(suggestion.metric, suggestion.target)})`
    : `${stored.target === null ? `Recommended for ${roleWord}: the target the match score uses` : `Your number, for every role`}` +
      (average ? ` · your ${roleWord} average ${fmtValue(metric, average.value)} (${average.n} games)` : '')

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Personal goal</Text>
      <View style={styles.metrics}>
        {GOAL_METRICS.map((m) => {
          const on = m.key === metric
          return (
            <Pressable key={m.key} onPress={() => pickMetric(m.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.metric, on && styles.metricOn]}>
              <Text style={[styles.metricText, on && styles.metricTextOn]} maxFontSizeMultiplier={1.15}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>
      {suggestion.reason === 'weakest' && suggestion.metric !== metric && suggestion.average !== null ? (
        <Pressable onPress={() => pickMetric(suggestion.metric)} accessibilityRole="button" style={styles.suggest}>
          <Text style={styles.suggestText} maxFontSizeMultiplier={1.15}>
            Your weakest as {roleWord}: {metricInfo(suggestion.metric).label.toLowerCase()}, {fmtValue(suggestion.metric, suggestion.average)} on average over {suggestion.n} games. Tap to pick it.
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.stepper}>
        <Pressable onPress={() => step(-1)} disabled={unscored} accessibilityRole="button" accessibilityLabel="Decrease" style={[styles.stepBtn, unscored && styles.stepOff]}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.value} maxFontSizeMultiplier={1.15}>{unscored ? formatGoal({ metric: suggestion.metric, target: suggestion.target }) : formatGoal({ metric, target })}</Text>
        <Pressable onPress={() => step(1)} disabled={unscored} accessibilityRole="button" accessibilityLabel="Increase" style={[styles.stepBtn, unscored && styles.stepOff]}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.source} maxFontSizeMultiplier={1.15}>{sourceLine}</Text>
      <Pressable
        disabled={saving}
        onPress={() => {
          setSaveError(null)
          const g = { championId: 0, role: 'ANY' as const, metric: stored.metric, target: stored.target }
          onSave(g, roleGoalRows(summaries, stored))
            .then(() => setSavedGoal({ metric: stored.metric, target: stored.target }))
            .catch((e: unknown) => setSaveError(e instanceof Error ? e.message : 'Could not save the goal'))
        }}
        accessibilityRole="button"
        style={[styles.save, saving && styles.saveOff]}
      >
        <Text style={styles.saveText} maxFontSizeMultiplier={1.15}>{saving ? 'Saving…' : saveState?.kind === 'saved' ? 'Saved ✓' : 'Save goal'}</Text>
      </Pressable>
      {saveError ? <Text style={styles.error} maxFontSizeMultiplier={1.15}>Couldn't save: {saveError}</Text> : null}
      {saveState ? (
        <Text style={saveState.kind === 'saved' ? styles.savedLine : styles.source} maxFontSizeMultiplier={1.15}>{saveState.line}</Text>
      ) : current ? (
        <Text style={styles.source} maxFontSizeMultiplier={1.15}>Current goal as {roleWord}: {formatGoal(current)}</Text>
      ) : null}
      <Text style={styles.hint} maxFontSizeMultiplier={1.15}>
        One goal for every game. Left at the recommended value, the number follows the role you get ({ROLES.filter((r) => roleTargetFor(r, metric) !== null).map((r) => `${ROLE_LABEL[r]} ${fmtValue(metric, roleTargetFor(r, metric)!)}`).join(' · ')}); move it and your number applies.
      </Text>
      {!unscored ? <GoalReference metric={metric} role={role} reference={goalReference(summaries, 0, role, metric)} target={target} /> : null}
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
  suggest: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.surface },
  suggestText: { color: colors.text, fontSize: font.caption, lineHeight: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepOff: { opacity: 0.35 },
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
