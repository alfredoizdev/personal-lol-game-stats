import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDuration, formatGoal, goalFor, goalMet, liveMetrics, metricInfo, summarizeMatch, type MatchV5 } from '@lpp/shared'
import { Screen } from '@/components/Screen'
import { LiveStatTiles } from '@/components/LiveStatTiles'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { useChampionList } from '@/hooks/useChampionList'
import { useGoals } from '@/hooks/useGoals'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { identityOf, matchDetailQuery, matchKeys } from '@/hooks/useRecentMatches'
import { useLiveFeed } from '@/lib/live-feed-context'
import { isReviewOf, reviewWaitState } from '@/lib/post-game-review'
import { fetchMatchIds, isRetryableRiotError } from '@/lib/riot-api'
import { supabase } from '@/lib/supabase'
import { colors, font, radius, space } from '@/theme/tokens'

const POLL_MS = 20_000
const LIST = 20

/**
 * Post-game (owner, 2026-10-23): what you did this game, whether the goal was
 * met, and the match review as soon as Riot's history lists the game. Opens by
 * itself when the game ends; Close returns to the tabs.
 */
export default function PostGameScreen() {
  const { snapshot, endedAt, now } = useLiveFeed()
  const { data: account } = useLinkedAccount()
  const { goals } = useGoals(account ?? null)
  const { byName } = useChampionList()
  const qc = useQueryClient()
  const endedAtRef = useRef(endedAt ?? Date.now())

  const goal = useMemo(() => {
    if (!snapshot || !account) return null
    const g = goalFor(goals, account.puuid, byName(snapshot.me.championName), snapshot.me.position)
    if (!g) return null
    const value = liveMetrics(snapshot)[g.metric]
    const m = metricInfo(g.metric)
    return { text: formatGoal(g), met: goalMet(g, value), now: value === null ? null : `${value.toFixed(m.decimals)}${g.metric === 'kpPct' ? '%' : ''}` }
  }, [snapshot, account, goals, byName])

  // Riot lists the game a minute or two later: refresh the Matches id list every 20 s until the newest match is this game.
  const [found, setFound] = useState<string | null>(null)
  const ids = useQuery({
    queryKey: matchKeys.ids(account?.puuid, LIST),
    queryFn: () => fetchMatchIds(supabase, { gameName: account!.gameName, tagLine: account!.tagLine, region: account!.region, count: LIST }),
    enabled: !!account,
    staleTime: 0,
    refetchInterval: found ? false : POLL_MS,
    retry: (n, err) => n < 2 && isRetryableRiotError(err),
  })
  const newest = ids.data?.[0] ?? null
  const detail = useQuery({ ...matchDetailQuery(newest ?? '', account?.region ?? 'NA', !!newest && !!account), enabled: !!newest && !!account })
  useEffect(() => {
    if (found || !newest || !detail.data || !account) return
    const s = summarizeMatch(detail.data as MatchV5, identityOf(account))
    if (s && isReviewOf(s, endedAtRef.current, snapshot?.gameTimeSeconds ?? null)) {
      setFound(newest)
      void qc.invalidateQueries({ queryKey: matchKeys.ownIds(account.puuid) }) // Prepare / Performance pick the game up too
    }
  }, [found, newest, detail.data, account, snapshot, qc])
  const review = useMemo(() => {
    if (!found || !detail.data || !account) return null
    return summarizeMatch(detail.data as MatchV5, identityOf(account))
  }, [found, detail.data, account])
  const wait = reviewWaitState({ found: found !== null, endedAt: endedAtRef.current, nowMs: now })

  return (
    <Screen
      title="Match ended"
      subtitle={snapshot ? `${snapshot.me.championName} · ${snapshot.gameTimeSeconds === null ? '--:--' : formatDuration(snapshot.gameTimeSeconds)}` : 'Your last game'}
      right={
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={styles.close}>
          <Text style={styles.closeText} maxFontSizeMultiplier={1.15}>Close</Text>
        </Pressable>
      }
    >
      {snapshot ? (
        <View style={styles.card}>
          <View style={styles.hero}>
            <ChampionPortrait championName={snapshot.me.championName} size={64} ring={review ? (review.me.win ? 'win' : 'loss') : 'none'} />
            <View style={styles.heroText}>
              <Text style={styles.result} maxFontSizeMultiplier={1.15}>{review ? (review.me.win ? 'Victory' : 'Defeat') : 'Game over'}</Text>
              <Text style={styles.muted} maxFontSizeMultiplier={1.15}>{snapshot.me.kills ?? 0} / {snapshot.me.deaths ?? 0} / {snapshot.me.assists ?? 0} · {snapshot.me.csPerMin === null ? '—' : snapshot.me.csPerMin.toFixed(1)} CS/min</Text>
            </View>
          </View>
          {goal ? (
            <View style={[styles.goal, { borderColor: goal.met === null ? colors.border : goal.met ? colors.win : colors.loss }]}>
              <Text style={styles.goalTitle} maxFontSizeMultiplier={1.15}>{goal.met === null ? 'Goal not measured' : goal.met ? 'Goal met' : 'Goal not met'}</Text>
              <Text style={styles.muted} maxFontSizeMultiplier={1.15}>{goal.text}{goal.now ? ` · you: ${goal.now}` : ''}</Text>
            </View>
          ) : null}
          <LiveStatTiles me={snapshot.me} teamKills={snapshot.teamKills} />
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle} maxFontSizeMultiplier={1.15}>Match review</Text>
        {wait === 'looking' ? (
          <View style={styles.row}>
            <ActivityIndicator color={colors.muted} />
            <Text style={styles.muted} maxFontSizeMultiplier={1.15}>Waiting for Riot to list the game in your history. Usually 1–2 minutes.</Text>
          </View>
        ) : null}
        {wait === 'found' && found ? (
          <Pressable style={styles.button} onPress={() => router.replace(`/(app)/(tabs)/matches/${found}`)} accessibilityRole="button">
            <Text style={styles.buttonText} maxFontSizeMultiplier={1.15}>Open the match review</Text>
          </Pressable>
        ) : null}
        {wait === 'gave-up' ? (
          <>
            <Text style={styles.muted} maxFontSizeMultiplier={1.15}>Not in your history yet. Practice Tool and custom games never appear; ranked and normal games can take a few minutes.</Text>
            <Pressable style={styles.buttonGhost} onPress={() => router.replace('/(app)/(tabs)/matches')} accessibilityRole="button">
              <Text style={styles.buttonText} maxFontSizeMultiplier={1.15}>Go to Matches</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  close: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  closeText: { color: colors.text, fontSize: font.caption + 1, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.md },
  cardTitle: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heroText: { flex: 1, gap: 2 },
  result: { color: colors.text, fontSize: font.body + 6, fontWeight: '900' },
  muted: { color: colors.muted, fontSize: font.body, flex: 1 },
  goal: { borderWidth: 1, borderRadius: radius.control, padding: space.sm, gap: 2 },
  goalTitle: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  button: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radius.control, paddingVertical: 12, paddingHorizontal: 18 },
  buttonGhost: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, paddingVertical: 12, paddingHorizontal: 18 },
  buttonText: { color: colors.text, fontWeight: '700' },
})
