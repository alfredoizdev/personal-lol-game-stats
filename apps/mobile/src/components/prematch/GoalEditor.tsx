import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  GOAL_METRICS,
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
  type RecommendedGoal,
  type Role,
  type RoleGoalRow,
  type StoredGoal,
} from '@lpp/shared'
import { GoalReference } from './GoalReference'
import { stepTarget } from '@/lib/goal-steps'
import { goalSaveState } from '@/lib/prematch-ui'
import { goalEditorInitial } from '@/lib/prepare-view'
import { colors, font, radius, space } from '@/theme/tokens'

const roleWordOf = (role: Role) => (role === 'UTILITY' ? 'support' : role.toLowerCase())
const fmtValue = (metric: GoalMetric, v: number) => `${v.toFixed(metricInfo(metric).decimals)}${metric === 'kpPct' ? '%' : ''}`

/** The number the stepper starts from for a metric: the shown role's target, else the first role that has one. */
function startTarget(metric: GoalMetric, role: Role): number {
  return roleTargetFor(role, metric) ?? ROLES.map((r) => roleTargetFor(r, metric)).find((t): t is number => t !== null) ?? 0
}

function reasonLine(r: RecommendedGoal, role: Role): string {
  const word = roleWordOf(role)
  if (r.reason === 'weakest' && r.average !== null) return `your weakest as ${word}: ${fmtValue(r.metric, r.average)} on average over ${r.n} games`
  if (r.n >= 3 && r.average !== null) return `every metric on target in your last ${r.n} ${word} games · the role's first metric (you: ${fmtValue(r.metric, r.average)})`
  return r.n === 0 ? `the role's first metric · no ${word} games of yours loaded yet` : `the role's first metric · only ${r.n} ${word} game${r.n === 1 ? '' : 's'} of yours`
}

/**
 * The one goal editor (owner, 2026-10-23: one place, easy to use; 2026-10-26: the
 * goal follows the role). Two ways to set it:
 *  - Recommended for my role (default): each role gets its own goal, the metric
 *    where the player is furthest below the role target in their own games as
 *    that role, else the role's first metric. Shown per role before saving.
 *  - A fixed metric and number, for every role (except where the metric is not
 *    scored: CS for support gets support's recommended goal).
 * Save writes the standing row plus one row per role, so Live, the review and the
 * desktop push resolve the same goal.
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
  const initial = goalEditorInitial(standing)
  const [mode, setMode] = useState<'recommended' | 'fixed'>(initial.mode)
  const [metric, setMetric] = useState<GoalMetric>(initial.mode === 'fixed' ? initial.metric : 'csPerMin')
  const [target, setTarget] = useState<number>(initial.mode === 'fixed' ? initial.target : startTarget('csPerMin', role))
  const [savedGoal, setSavedGoal] = useState<{ metric: GoalMetric; target: number | null } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const perRole = useMemo(() => ROLES.map((r) => ({ role: r, rec: recommendedGoal(summaries, r) })), [summaries])
  const current = goalFor(goals, puuid, null, role)
  const info = metricInfo(metric)
  const roleWord = roleWordOf(role)

  const stored = mode === 'recommended' ? { metric: perRole.find((p) => p.role === role)!.rec.metric, target: null } : { metric, target }
  const saveState = goalSaveState(savedGoal, stored)
  const canSave = !saving

  const pickMetric = (m: GoalMetric) => {
    setMode('fixed')
    setMetric(m)
    setTarget(standing && standing.metric === m && standing.target !== null ? standing.target : startTarget(m, role))
    setSaveError(null)
  }
  const step = (dir: 1 | -1) => {
    setSaveError(null)
    setTarget((t) => stepTarget(metric, t, dir))
  }
  const unscored = mode === 'fixed' ? ROLES.filter((r) => roleTargetFor(r, metric) === null) : []

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Personal goal</Text>
      <View style={styles.metrics}>
        <Pressable onPress={() => { setMode('recommended'); setSaveError(null) }} accessibilityRole="tab" accessibilityState={{ selected: mode === 'recommended' }} style={[styles.metric, mode === 'recommended' && styles.metricOn]}>
          <Text style={[styles.metricText, mode === 'recommended' && styles.metricTextOn]} maxFontSizeMultiplier={1.15}>Recommended for my role</Text>
        </Pressable>
        {GOAL_METRICS.map((m) => {
          const on = mode === 'fixed' && m.key === metric
          return (
            <Pressable key={m.key} onPress={() => pickMetric(m.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.metric, on && styles.metricOn]}>
              <Text style={[styles.metricText, on && styles.metricTextOn]} maxFontSizeMultiplier={1.15}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {mode === 'recommended' ? (
        <View style={styles.roles}>
          {perRole.map(({ role: r, rec }) => (
            <View key={r} style={[styles.roleRow, r === role && styles.roleRowOn]}>
              <View style={styles.roleHead}>
                <Text style={[styles.roleName, r === role && styles.roleNameOn]} maxFontSizeMultiplier={1.15}>{ROLE_LABEL[r]}</Text>
                <Text style={styles.roleGoal} maxFontSizeMultiplier={1.15}>{formatGoal({ metric: rec.metric, target: rec.target })}</Text>
              </View>
              <Text style={styles.roleWhy} maxFontSizeMultiplier={1.15}>{reasonLine(rec, r)}</Text>
            </View>
          ))}
          <Text style={styles.source} maxFontSizeMultiplier={1.15}>From your own last games in each role, against the role targets the match score uses. Saved goals update when you save again.</Text>
        </View>
      ) : (
        <>
          <View style={styles.stepper}>
            <Pressable onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel="Decrease" style={styles.stepBtn}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.value} maxFontSizeMultiplier={1.15}>{formatGoal({ metric, target })}</Text>
            <Pressable onPress={() => step(1)} accessibilityRole="button" accessibilityLabel="Increase" style={styles.stepBtn}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.source} maxFontSizeMultiplier={1.15}>
            {`${info.label} ${formatGoal({ metric, target })} for every role`}
            {roleTargetFor(role, metric) !== null ? ` · ${roleWord} target ${fmtValue(metric, roleTargetFor(role, metric)!)}` : ''}
            {unscored.length ? ` · ${unscored.map((r) => ROLE_LABEL[r]).join(', ')}: ${info.label} is not scored, so ${unscored.map((r) => roleWordOf(r)).join(' and ')} keeps the recommended goal` : ''}
          </Text>
          {roleTargetFor(role, metric) !== null ? <GoalReference metric={metric} role={role} reference={goalReference(summaries, 0, role, metric)} target={target} /> : null}
        </>
      )}

      {current ? (
        <Text style={styles.source} maxFontSizeMultiplier={1.15}>Current goal as {roleWord}: {formatGoal(current)}</Text>
      ) : null}
      <Pressable
        disabled={!canSave}
        onPress={() => {
          if (!canSave) return
          setSaveError(null)
          const g = { championId: 0, role: 'ANY' as const, metric: stored.metric, target: stored.target }
          onSave(g, roleGoalRows(summaries, stored))
            .then(() => setSavedGoal({ metric: stored.metric, target: stored.target }))
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
        Shows on the Live tab whatever role you get, and is checked in the match review.{mode === 'fixed' ? ` Step ${info.step}${info.unit.trim()}.` : ''}
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
  roles: { gap: 6 },
  roleRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  roleRowOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  roleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.sm },
  roleName: { color: colors.muted, fontSize: font.caption + 1, fontWeight: '800' },
  roleNameOn: { color: colors.text },
  roleGoal: { color: colors.text, fontSize: font.body, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  roleWhy: { color: colors.muted, fontSize: font.caption - 1 },
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
