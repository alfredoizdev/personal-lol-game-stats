import { useMemo } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { formatRiotId } from '@lpp/shared'
import { Disclaimer } from '@/components/Disclaimer'
import { SummonerAvatar } from '@/components/SummonerAvatar'
import { MatchRow } from '@/components/MatchRow'
import { PerformanceHeader } from '@/components/PerformanceHeader'
import { RiotErrorView } from '@/components/RiotErrorView'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { useRecentMatches, type MatchRowState } from '@/hooks/useRecentMatches'
import { aggregateMatches } from '@/lib/match-aggregates'
import { riotErrorCode } from '@/lib/riot-api'
import { colors, font, radius, space } from '@/theme/tokens'

export default function MatchesScreen() {
  const { data: account } = useLinkedAccount()
  const { ids, matches, refresh, isRefreshing, hasMore, loadMore, total } = useRecentMatches(account ?? null)
  const now = Date.now()

  const ready = useMemo(() => matches.filter((m): m is Extract<MatchRowState, { status: 'ready' }> => m.status === 'ready'), [matches])
  const visible = useMemo(() => matches.filter((m) => !(m.status === 'error' && m.error === 'NOT_FOUND')), [matches])
  const agg = useMemo(() => aggregateMatches(ready.map((m) => m.summary)), [ready])

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>My Matches</Text>
          {account ? <Text style={styles.summoner}>{formatRiotId(account.gameName, account.tagLine)}</Text> : null}
          <Text style={styles.subtitle}>Recent performance</Text>
        </View>
        {account ? (
          <Pressable onPress={() => router.push('/(app)/profile')} accessibilityRole="button" accessibilityLabel="Profile" hitSlop={8}>
            <SummonerAvatar account={account} size={52} />
          </Pressable>
        ) : null}
      </View>
      {ready.length > 0 ? <PerformanceHeader agg={agg} /> : null}
      {ids.isError ? <RiotErrorView code={riotErrorCode(ids.error)} onRetry={() => void refresh()} /> : null}
      {ids.isSuccess && ids.data.length === 0 ? <Text style={styles.muted}>No recent matches for this account.</Text> : null}
      <Text style={styles.section}>Recent Games{ids.data ? ` (${total})` : ''}</Text>
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
        renderItem={({ item }) => <Row item={item} now={now} />}
      />
    </SafeAreaView>
  )
}

const SKELETON: MatchRowState[] = Array.from({ length: 5 }, (_, i) => ({ matchId: `skeleton-${i}`, status: 'loading' as const }))

function Row({ item, now }: { item: MatchRowState; now: number }) {
  if (item.status === 'ready') {
    return <MatchRow summary={item.summary} now={now} onPress={() => router.push(`/(app)/match/${item.matchId}`)} />
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
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  titleBlock: { flex: 1 },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800', letterSpacing: -0.5 },
  summoner: { color: colors.you, fontSize: font.body, fontWeight: '700', marginTop: 2 },
  subtitle: { color: colors.muted, fontSize: font.caption + 2, marginTop: 2 },
  section: { color: colors.text, fontSize: font.body, fontWeight: '700', marginTop: space.xs },
  muted: { color: colors.muted, fontSize: font.body },
  placeholder: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, minHeight: 92, justifyContent: 'center' },
  skeleton: { opacity: 0.5 },
  code: { color: colors.muted, fontSize: font.caption - 1, marginTop: 4 },
  footer: { paddingVertical: space.lg, gap: space.md },
})
