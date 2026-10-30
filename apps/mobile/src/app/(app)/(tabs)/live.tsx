import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { accountToFollow, formatGoal, goalFor, goalMet, goalStatus, liveMetrics, liveScreenMode, metricInfo, stillLoading } from '@lpp/shared'
import { Screen } from '@/components/Screen'
import { LiveHero } from '@/components/LiveHero'
import { LiveMatchupTable } from '@/components/LiveMatchupTable'
import { LiveStatTiles } from '@/components/LiveStatTiles'
import { LiveTrendChart } from '@/components/LiveTrendChart'
import { AlertStack } from '@/components/live/AlertStack'
import { EventsFeed } from '@/components/live/EventsFeed'
import { ImpactCard } from '@/components/live/ImpactCard'
import { LastMatchCard } from '@/components/live/LastMatchCard'
import { PhaseCard } from '@/components/live/PhaseCard'
import { PrepareCard } from '@/components/prematch/PrepareCard'
import { useChampionList } from '@/hooks/useChampionList'
import { useGoals } from '@/hooks/useGoals'
import { useLinkedAccount, useLinkedAccounts } from '@/hooks/useLinkedAccount'
import { useLiveAlerts } from '@/hooks/useLiveAlerts'
import { useLiveFeed } from '@/lib/live-feed-context'
import { showEventsFeed } from '@/lib/live-sections'
import { appendTrendPoint, type TrendPoint } from '@/lib/live-trend'
import { colors, font, radius, space } from '@/theme/tokens'

export default function LiveScreen() {
  const { snapshot, state, connected, phase, phaseReceivedAt, receivedAt, endedAt, now } = useLiveFeed()
  const { data: account } = useLinkedAccount()
  const { data: accounts } = useLinkedAccounts()
  // League signed in as an account that is not linked: say so (a linked one is switched to by itself).
  const follow = accountToFollow(phase?.who, accounts ?? [], account?.puuid ?? null)
  const unlinked = follow?.kind === 'unlinked' ? follow.riotId : null
  const { goals } = useGoals(account ?? null)
  const { byName } = useChampionList()
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [dismissed, setDismissed] = useState(false)

  // The goal for the champion you are playing (by name → Data Dragon id), else the newest one for the role.
  const liveGoal = useMemo(() => {
    if (!snapshot || !account) return null
    const g = goalFor(goals, account.puuid, byName(snapshot.me.championName), snapshot.me.position)
    if (!g) return null
    const value = liveMetrics(snapshot)[g.metric]
    const m = metricInfo(g.metric)
    return { text: formatGoal(g), status: goalStatus(g, value), met: goalMet(g, value), now: value === null ? null : `${value.toFixed(m.decimals)}${g.metric === 'kpPct' ? '%' : ''}` }
  }, [snapshot, account, goals, byName])

  const { alerts, dismiss } = useLiveAlerts(snapshot, liveGoal, phase, now)

  useEffect(() => {
    if (snapshot) setTrend((h) => appendTrendPoint(h, snapshot))
  }, [snapshot])

  const mode = liveScreenMode({ view: state, endedAtMs: endedAt, nowMs: now, phase: phase?.phase ?? null, phaseAgeMs: phase ? now - phaseReceivedAt : Infinity, dismissed })
  useEffect(() => {
    if (mode === 'live') setDismissed(false) // the next game clears the last-match card
  }, [mode])

  return (
    <Screen title="Live Match" subtitle="In-game performance" overlay={<AlertStack alerts={alerts} onDismiss={dismiss} />}>
      {mode === 'pre' || mode === 'after' ? (
        <>
          {mode === 'after' && snapshot ? <LastMatchCard snapshot={snapshot} goal={liveGoal ? { text: liveGoal.text, met: liveGoal.met } : null} onDismiss={() => setDismissed(true)} /> : null}
          <PhaseCard phase={phase} receivedAt={phaseReceivedAt} now={now} connected={connected} />
          {unlinked ? (
            <Pressable onPress={() => router.push('/(app)/link')} accessibilityRole="button" style={styles.unlinked}>
              <Text style={styles.unlinkedText} maxFontSizeMultiplier={1.15}>League is signed in as {unlinked}, which isn't linked. Tap to link it.</Text>
            </Pressable>
          ) : null}
          {account ? <PrepareCard account={account} /> : null}
        </>
      ) : snapshot ? (
        <>
          <LiveHero
            snapshot={snapshot}
            badge={state === 'ended' ? 'ENDED' : state === 'stale' ? (stillLoading(snapshot) ? 'LOADING' : 'RECONNECTING') : snapshot.gameMode === 'DEMO' ? 'DEMO' : 'LIVE'}
            goal={liveGoal}
            receivedAt={receivedAt}
            now={now}
          />
          {state === 'stale' ? (
            stillLoading(snapshot) ? (
              <Text style={styles.muted}>The game is still loading. Your stats start with the first minute.</Text>
            ) : (
              <Text style={styles.warn}>No update from the desktop for a while. Reconnecting…</Text>
            )
          ) : null}
          <ImpactCard snapshot={snapshot} />
          {state === 'ended' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Match ended</Text>
              <Text style={styles.muted}>Your review will appear in Matches in a minute.</Text>
              <Pressable style={styles.button} onPress={() => router.navigate('/(app)/(tabs)/matches')} accessibilityRole="button">
                <Text style={styles.buttonText}>Go to Matches</Text>
              </Pressable>
            </View>
          ) : null}
          <LiveMatchupTable me={snapshot.me} opponent={snapshot.opponent} />
          <LiveStatTiles me={snapshot.me} teamKills={snapshot.teamKills} />
          {showEventsFeed(state) ? <EventsFeed events={snapshot.events} myChampion={snapshot.me.championName} /> : null}
          <LiveTrendChart points={trend} />
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  unlinked: { borderWidth: 1, borderColor: colors.warn, borderRadius: radius.card, padding: space.sm + 4 },
  unlinkedText: { color: colors.warn, fontSize: font.caption + 1, lineHeight: 19 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  cardTitle: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: font.body },
  warn: { color: colors.warn, fontSize: font.caption + 1 },
  button: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radius.control, paddingVertical: 10, paddingHorizontal: 18, marginTop: 4 },
  buttonText: { color: colors.text, fontWeight: '700' },
})
