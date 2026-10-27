import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { analyzeMatch, csCurve, goalFor, goldDiffCurve, metricsOf, summarizeMatch, type AreaKey, type GoalMetric, type PhaseKey } from '@lpp/shared'
import { AreaCard } from '@/components/AreaCard'
import { AreaPills } from '@/components/AreaPills'
import { CsCurveChart } from '@/components/CsCurveChart'
import { Disclaimer } from '@/components/Disclaimer'
import { GoldDiffChart } from '@/components/GoldDiffChart'
import { LaneMatchupCard } from '@/components/LaneMatchupCard'
import { MatchHero } from '@/components/MatchHero'
import { OverallScoreCard } from '@/components/OverallScoreCard'
import { RiotErrorView } from '@/components/RiotErrorView'
import { useBaseline } from '@/hooks/useBaseline'
import { useGoals } from '@/hooks/useGoals'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { useMatchTimeline } from '@/hooks/useMatchTimeline'
import { identityOf, matchDetailQuery } from '@/hooks/useRecentMatches'
import { analysisInputFromQueries, needsAnalysisData } from '@/lib/analysis-input'
import { defaultArea } from '@/lib/area-ui'
import { goalLine } from '@/lib/goal-line'
import { setReviewOpen } from '@/lib/review-focus'
import { riotErrorCode } from '@/lib/riot-api'
import { colors, font, radius, space } from '@/theme/tokens'

export default function MatchReviewScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>()
  const id = String(matchId)
  // The pre-match backfill waits while a review is on screen (its timeline/baseline calls come first).
  useFocusEffect(
    useCallback(() => {
      setReviewOpen(true)
      return () => setReviewOpen(false)
    }, []),
  )
  const { data: account } = useLinkedAccount()
  const region = account?.region ?? 'NA'
  const detail = useQuery({ ...matchDetailQuery(id, region), enabled: !!matchId && !!account })
  const summary = useMemo(
    () => (detail.data && account ? summarizeMatch(detail.data, identityOf(account)) : null),
    [detail.data, account],
  )
  const wantsAnalysis = needsAnalysisData(summary)
  const timeline = useMatchTimeline(wantsAnalysis ? id : undefined, region)
  const baseline = useBaseline(account ?? null, wantsAnalysis ? summary?.me.role ?? null : null, id)
  const { goals } = useGoals(account ?? null)

  // The goal in force when this game ended (set at or before game end), attached to the area that owns its metric.
  const goalByArea = useMemo(() => {
    if (!summary || !account || !summary.me.role) return {} as Partial<Record<AreaKey, { text: string; met: boolean | null }>>
    const end = Date.parse(summary.startedAt) + summary.durationSec * 1000
    const g = goalFor(goals, account.puuid, summary.me.championId, summary.me.role, end)
    if (!g) return {}
    const value = metricsOf(summary.me, summary.durationSec, summary.teamKills)[g.metric]
    const owner: Record<GoalMetric, AreaKey> = { csPerMin: 'farming', visionPerMin: 'vision', deathsPer10: 'combat', kpPct: 'combat' }
    return { [owner[g.metric]]: goalLine(g, value) }
  }, [summary, account, goals])

  const { input, timelineError, baselineLoading } = analysisInputFromQueries({
    summary,
    series: timeline.isSuccess ? { status: 'success', data: timeline.data } : timeline.isError ? { status: 'error', error: timeline.error } : { status: 'pending' },
    baseline: { loading: baseline.loading, data: baseline.baseline },
  })
  const analysis = useMemo(() => (input ? analyzeMatch(input) : null), [input])

  // The weakest area can change once the timeline lands (Lane and the phases join),
  // so the default follows the data until the user taps a pill.
  const [picked, setPicked] = useState<AreaKey | null>(null)
  const active = picked ?? (analysis ? defaultArea(analysis) : null)
  const area = analysis?.analyzable ? analysis.areas.find((a) => a.key === active) ?? null : null

  const chart = useMemo(() => {
    if (!summary || !area || !input?.series) return null
    const me = summary.me.participantId
    const opp = summary.opponent?.participantId ?? null
    if (area.key === 'farming') {
      const weakest = area.subrows.filter((r) => !r.context && r.score !== null && r.key !== 'total').sort((a, b) => a.score! - b.score!)[0]
      return <CsCurveChart curve={csCurve(input.series, me, opp)} durationSec={summary.durationSec} weakestPhase={(weakest?.key as PhaseKey | undefined) ?? null} />
    }
    if (area.key === 'lane' && opp !== null) {
      return <GoldDiffChart curve={goldDiffCurve(input.series, me, opp)} durationSec={summary.durationSec} />
    }
    return null
  }, [summary, area, input?.series])

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/matches'))} hitSlop={10} accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>Match Review</Text>
            <Text style={styles.subtitle}>{summary ? `${summary.gameMode === 'CLASSIC' ? "Summoner's Rift" : summary.gameMode}  •  ${summary.queueLabel}` : ' '}</Text>
          </View>
        </View>

        {detail.isPending ? <ActivityIndicator color={colors.muted} style={styles.spinner} /> : null}
        {detail.isError ? <RiotErrorView code={riotErrorCode(detail.error)} onRetry={() => void detail.refetch()} /> : null}
        {detail.isSuccess && !summary ? <Text style={styles.muted}>This account did not play in this match.</Text> : null}

        {summary ? (
          <>
            <MatchHero summary={summary} />

            {analysis?.analyzable ? (
              <>
                <OverallScoreCard analysis={analysis} baselineLoading={baselineLoading} />
                <AreaPills areas={analysis.areas} active={area?.key ?? analysis.areas[0]!.key} onChange={setPicked} />
                {area ? (
                  <AreaCard
                    area={area}
                    baselineN={analysis.baselineN}
                    baselineLoading={baselineLoading}
                    chart={chart}
                    timelineError={timelineError}
                    onRetryTimeline={() => void timeline.refetch()}
                    goalLine={goalByArea[area.key] ?? null}
                  />
                ) : null}
                {timeline.isPending ? <Text style={styles.hint}>Loading the timeline for phases and lane leads…</Text> : null}
              </>
            ) : analysis ? (
              <View style={styles.note}>
                <Text style={styles.noteTitle}>No analysis for this game</Text>
                <Text style={styles.muted}>{analysis.reason}</Text>
              </View>
            ) : null}

            <LaneMatchupCard me={summary.me} opponent={summary.opponent} />

            {analysis?.analyzable && summary.me.role ? (
              <Pressable
                onPress={() => router.push(`/(app)/(tabs)/matches/how-scored?role=${summary.me.role}&n=${analysis.baselineN}`)}
                accessibilityRole="link"
                hitSlop={6}
              >
                <Text style={styles.link}>How it's scored ›</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        <View style={styles.footer}>
          <Disclaimer />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.md, paddingTop: space.md, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { width: 40, height: 40, borderRadius: radius.control, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 28, lineHeight: 30, marginTop: -4 },
  title: { color: colors.text, fontSize: font.title - 4, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: font.caption + 1 },
  spinner: { marginTop: space.lg },
  muted: { color: colors.muted, fontSize: font.body },
  hint: { color: colors.muted, fontSize: font.caption + 1, textAlign: 'center' },
  note: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: 4 },
  noteTitle: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  link: { color: colors.accent, fontSize: font.body, fontWeight: '700', textAlign: 'center' },
  footer: { paddingVertical: space.lg },
})
