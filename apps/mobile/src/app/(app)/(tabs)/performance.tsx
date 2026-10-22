import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatRiotId, performanceProfile } from '@lpp/shared'
import { Screen } from '@/components/Screen'
import { AreasCard } from '@/components/performance/AreasCard'
import { ChampionsCard } from '@/components/performance/ChampionsCard'
import { MatchupsCard } from '@/components/performance/MatchupsCard'
import { OverviewCard } from '@/components/performance/OverviewCard'
import { RolesCard } from '@/components/performance/RolesCard'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { useOwnHistory } from '@/hooks/useOwnHistory'
import { gamesNote, loadState, WINDOW } from '@/lib/performance-ui'
import { riotErrorCode } from '@/lib/riot-api'
import { colors, font, radius, space } from '@/theme/tokens'

/** The tab fetches its own window on open: the last 20 games plus the 20 before them (for "vs previous"). Once per account; cached forever. */
const AUTO_LOAD = WINDOW * 2

/** Your performance from your last 20 Summoner's Rift games (Phase 6 spec; owner's window). */
export default function PerformanceScreen() {
  const { data: account } = useLinkedAccount()
  const history = useOwnHistory(account ?? null, false)
  const puuid = account?.puuid
  const [attemptedFor, setAttemptedFor] = useState<string | null>(null)
  const startedFor = useRef<string | null>(null)

  const loadedInWindow = history.loadedWithin(WINDOW)
  const windowSize = Math.min(WINDOW, history.total)

  // Auto-load the window once per account; "Retry" below starts it again by hand.
  useEffect(() => {
    if (!puuid || history.total === 0 || startedFor.current === puuid) return
    startedFor.current = puuid
    if (history.loadedWithin(AUTO_LOAD) < Math.min(AUTO_LOAD, history.total)) history.start(AUTO_LOAD)
    setAttemptedFor(puuid)
  }, [puuid, history])

  const state = loadState({ idsPending: history.idsPending, total: history.total, loadedInWindow, running: history.running, attempted: attemptedFor === puuid })
  const profile = useMemo(() => performanceProfile(history.summaries, WINDOW), [history.summaries])
  const subtitle = account ? `${formatRiotId(account.gameName, account.tagLine)} · ${gamesNote(profile).toLowerCase()}` : 'Your own games only'
  const rateLimited = riotErrorCode(history.error) === 'RATE_LIMITED'

  return (
    <Screen title="Performance" subtitle={subtitle}>
      {state === 'loading' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.15}>Loading your last {WINDOW} games…</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={1.15}>{history.total ? `${loadedInWindow} of ${windowSize} ready` : 'Finding your recent games…'}</Text>
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
          <OverviewCard profile={profile} />
          <RolesCard profile={profile} />
          <AreasCard profile={profile} />
          <ChampionsCard profile={profile} />
          <MatchupsCard profile={profile} />
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
