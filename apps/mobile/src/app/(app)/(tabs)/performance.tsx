import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatRiotId, goalProgress, inQueueFilter, mainRole, performanceProfile, QUEUE_FILTER_LABEL, rankTier, sessionPatterns, tierComparison } from '@lpp/shared'
import { QueueFilterChips } from '@/components/QueueFilterChips'
import { Screen } from '@/components/Screen'
import { SessionsCard } from '@/components/performance/SessionsCard'
import { GoalProgressCard } from '@/components/performance/GoalProgressCard'
import { TierCompareCard } from '@/components/performance/TierCompareCard'
import { useGoals } from '@/hooks/useGoals'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { useQueueFilter } from '@/hooks/useQueueFilter'
import { useRank } from '@/hooks/useRank'
import { useHistory } from '@/lib/history-context'
import { BACKFILL_COUNT } from '@/lib/backfill'
import { gamesNote, loadState, WINDOW } from '@/lib/performance-ui'
import { riotErrorCode } from '@/lib/riot-api'
import { colors, font, radius, space } from '@/theme/tokens'

/** Retry reloads the whole window the launch load fetches (the history is loaded once for every tab). */
const AUTO_LOAD = BACKFILL_COUNT

/**
 * "¿Estoy mejorando?" (owner, 2026-10-30, one question per screen): your goal week by week,
 * you vs your tier, your sessions — from your last 100 Summoner's Rift games. The recent-20
 * arcs live on Matches; champions are one line there.
 */
export default function PerformanceScreen() {
  const { data: account } = useLinkedAccount()
  const history = useHistory()
  const puuid = account?.puuid

  const loadedInWindow = history.loadedWithin(WINDOW)
  const windowSize = Math.min(WINDOW, history.total)

  const state = loadState({ idsPending: history.idsPending, total: history.total, loadedInWindow, running: history.running, attempted: !!puuid && history.started })
  const [queueFilter, setQueueFilter] = useQueueFilter()
  const filtered = useMemo(() => history.summaries.filter((s) => inQueueFilter(s.queueId, queueFilter)), [history.summaries, queueFilter])
  const profile = useMemo(() => performanceProfile(filtered, WINDOW), [filtered])
  const { rank } = useRank(account ?? null)
  const tier = rankTier(rank?.solo?.tier ?? null)
  const role = useMemo(() => mainRole(filtered), [filtered])
  const compare = useMemo(() => (role ? tierComparison(filtered, tier, role) : []), [filtered, tier, role])
  const { goals } = useGoals(account ?? null)
  const progress = useMemo(() => (puuid ? goalProgress(filtered, goals, puuid, Date.now()) : null), [filtered, goals, puuid])
  const sessions = useMemo(() => sessionPatterns(filtered), [filtered])
  const subtitle = account ? `${formatRiotId(account.gameName, account.tagLine)} · ${queueFilter === 'all' ? '' : `${QUEUE_FILTER_LABEL[queueFilter].toLowerCase()} · `}${gamesNote(profile).toLowerCase()}` : 'Your own games only'
  const rateLimited = riotErrorCode(history.error) === 'RATE_LIMITED'

  return (
    <Screen title="Performance" subtitle={subtitle}>
      <QueueFilterChips value={queueFilter} onChange={setQueueFilter} />
      {state === 'loading' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.15}>Loading your last {WINDOW} games…</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={1.15}>{history.total ? `${loadedInWindow} of ${windowSize} ready · once per account, then instant` : 'Finding your recent games…'}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${windowSize ? Math.round((loadedInWindow / windowSize) * 100) : 0}%` }]} />
          </View>
        </View>
      ) : null}
      {state === 'empty' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.15}>No recent games found</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={1.15}>{history.error ? "Couldn't list your games. Pull down on Matches to retry." : 'Play a Summoner\'s Rift game and come back.'}</Text>
        </View>
      ) : null}
      {state === 'short' ? (
        <View style={[styles.card, styles.warnCard]}>
          <Text style={styles.warnText} maxFontSizeMultiplier={1.15}>
            Only {loadedInWindow} of your last {windowSize} games loaded{rateLimited ? ' (Riot is rate-limiting)' : ''}. The numbers below use those {loadedInWindow}.
          </Text>
          <Pressable onPress={() => history.start(AUTO_LOAD)} accessibilityRole="button" style={styles.retry}>
            <Text style={styles.retryText} maxFontSizeMultiplier={1.15}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {state === 'ready' || state === 'short' ? (
        <>
          {progress ? <GoalProgressCard progress={progress} /> : null}
          {role && compare.length ? <TierCompareCard rows={compare} tier={tier ?? 'Gold'} ranked={tier !== null} role={role} games={profile.roles.find((r) => r.role === role)?.games ?? 0} /> : null}
          {sessions ? <SessionsCard patterns={sessions} /> : null}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  cardTitle: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: font.body },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  warnCard: { flexDirection: 'row', alignItems: 'center', borderColor: colors.warn },
  warnText: { flex: 1, color: colors.warn, fontSize: font.caption + 1, lineHeight: 19 },
  retry: { borderWidth: 1, borderColor: colors.warn, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  retryText: { color: colors.text, fontSize: font.caption, fontWeight: '700' },
})
