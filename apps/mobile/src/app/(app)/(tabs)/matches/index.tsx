import { useMemo } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { inQueueFilter, lpChanges, QUEUE_FILTER_LABEL, queueGroup, type LpChange } from '@lpp/shared'
import { Disclaimer } from '@/components/Disclaimer'
import { RankHeader } from '@/components/RankHeader'
import { MatchRow } from '@/components/MatchRow'
import { QueueFilterChips } from '@/components/QueueFilterChips'
import { PerformanceHeader } from '@/components/PerformanceHeader'
import { RiotErrorView } from '@/components/RiotErrorView'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { useQueueFilter } from '@/hooks/useQueueFilter'
import { useRank, useRankHistory } from '@/hooks/useRank'
import { useRecentMatches, type MatchRowState } from '@/hooks/useRecentMatches'
import { headerDonuts } from '@/lib/header-donuts'
import { mostPlayedLine } from '@/lib/most-played'
import { aggregateMatches } from '@/lib/match-aggregates'
import { lpHint } from '@/lib/match-row-view'
import { riotErrorCode } from '@/lib/riot-api'
import { colors, font, radius, space } from '@/theme/tokens'

export default function MatchesScreen() {
  const { data: account } = useLinkedAccount()
  const { ids, matches, refresh, isRefreshing, hasMore, loadMore, total } = useRecentMatches(account ?? null)
  const now = Date.now()

  const [queueFilter, setQueueFilter] = useQueueFilter()
  const { rank, loading: rankLoading } = useRank(account ?? null)
  const snapshots = useRankHistory(account ?? null)
  // LP per ranked game from the stored standings (every loaded game, whatever the filter).
  const lp = useMemo(() => lpChanges(snapshots, matches.flatMap((m) => (m.status === 'ready' ? [m.summary] : []))), [snapshots, matches])
  // Ranked apart from normals (owner, 2026-10-27): the filter applies to the list and to the Last 10 donuts; rows carry the queue tag.
  const ready = useMemo(() => matches.filter((m): m is Extract<MatchRowState, { status: 'ready' }> => m.status === 'ready' && inQueueFilter(m.summary.queueId, queueFilter)), [matches, queueFilter])
  const visible = useMemo(
    () => matches.filter((m) => !(m.status === 'error' && m.error === 'NOT_FOUND') && (m.status !== 'ready' || inQueueFilter(m.summary.queueId, queueFilter))),
    [matches, queueFilter],
  )
  const summaries = useMemo(() => ready.map((m) => m.summary), [ready])
  const hint = lpHint({ lpCount: lp.size, rankedListed: ready.some((m) => queueGroup(m.summary.queueId) === 'ranked') })
  const agg = useMemo(() => aggregateMatches(summaries), [summaries])
  const donuts = useMemo(() => headerDonuts(summaries), [summaries])
  const mostPlayed = useMemo(() => mostPlayedLine(summaries), [summaries])

  const header = (
    <View style={styles.headerBlock}>
      {account ? <RankHeader account={account} rank={rank} loading={rankLoading} /> : null}
      <QueueFilterChips value={queueFilter} onChange={setQueueFilter} />
      {ready.length > 0 ? <PerformanceHeader games={agg.games} donuts={donuts} mostPlayed={mostPlayed} /> : null}
      {ready.length === 0 && ids.isSuccess && ids.data.length > 0 && queueFilter !== 'all' ? <Text style={styles.muted}>No {QUEUE_FILTER_LABEL[queueFilter].toLowerCase()} games among your recent ones. Scroll loads more.</Text> : null}
      {ids.isError ? <RiotErrorView code={riotErrorCode(ids.error)} onRetry={() => void refresh()} /> : null}
      {ids.isSuccess && ids.data.length === 0 ? <Text style={styles.muted}>No recent matches for this account.</Text> : null}
      <Text style={styles.section}>Recent Games{ids.data ? ` (${queueFilter === 'all' ? total : `${ready.length} ${QUEUE_FILTER_LABEL[queueFilter].toLowerCase()} of ${total}`})` : ''}</Text>
      {hint ? <Text style={styles.hint} maxFontSizeMultiplier={1.15}>{hint}</Text> : null}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={ids.isPending && account ? SKELETON : visible}
        keyExtractor={(m) => m.matchId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListFooterComponent={
          <View style={styles.footer}>
            {hasMore ? <Text style={styles.muted}>Scroll for more…</Text> : null}
            <Disclaimer />
          </View>
        }
        onEndReached={() => { if (hasMore) loadMore() }}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} tintColor={colors.muted} />}
        renderItem={({ item }) => <Row item={item} now={now} lp={item.status === 'ready' ? lp.get(item.matchId) ?? null : null} />}
      />
    </SafeAreaView>
  )
}

const SKELETON: MatchRowState[] = Array.from({ length: 5 }, (_, i) => ({ matchId: `skeleton-${i}`, status: 'loading' as const }))

function Row({ item, now, lp }: { item: MatchRowState; now: number; lp: LpChange | null }) {
  if (item.status === 'ready') {
    return <MatchRow summary={item.summary} now={now} lp={lp} onPress={() => router.push(`/(app)/(tabs)/matches/${item.matchId}`)} />
  }
  if (item.status === 'error') {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.muted}>Couldn't load this game.</Text>
        <Text style={styles.code}>{item.error}</Text>
      </View>
    )
  }
  if (item.status === 'not-participant') {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.muted}>This account isn't in this match's data.</Text>
        <Text style={styles.code}>Linked puuid does not match Riot's — re-link the Riot ID in Profile.</Text>
      </View>
    )
  }
  return <View style={[styles.placeholder, styles.skeleton]} />
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: space.md, paddingTop: space.md, gap: space.sm + 4, maxWidth: 720, width: '100%', alignSelf: 'center' },
  headerBlock: { gap: space.md, marginBottom: 4 },
  section: { color: colors.text, fontSize: font.body, fontWeight: '700', marginTop: space.xs },
  muted: { color: colors.muted, fontSize: font.body },
  hint: { color: colors.muted, fontSize: font.caption, marginTop: -8 },
  placeholder: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, minHeight: 92, justifyContent: 'center' },
  skeleton: { opacity: 0.5 },
  code: { color: colors.muted, fontSize: font.caption - 1, marginTop: 4 },
  footer: { paddingVertical: space.lg, gap: space.md },
})
