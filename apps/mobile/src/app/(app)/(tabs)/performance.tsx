import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { formatRiotId, performanceProfile } from '@lpp/shared'
import { Screen } from '@/components/Screen'
import { AreasCard } from '@/components/performance/AreasCard'
import { ChampionsCard } from '@/components/performance/ChampionsCard'
import { MatchupsCard } from '@/components/performance/MatchupsCard'
import { OverviewCard } from '@/components/performance/OverviewCard'
import { RolesCard } from '@/components/performance/RolesCard'
import { BackfillBar } from '@/components/prematch/BackfillBar'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { useOwnHistory } from '@/hooks/useOwnHistory'
import { gamesNote } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/** Owner's call (2026-10-22): the last 20 games are plenty for these stats — no period picker. */
const PERIOD = 20

/** Your performance from your own cached games: no new Riot calls (Phase 6 spec). */
export default function PerformanceScreen() {
  const { data: account } = useLinkedAccount()
  const history = useOwnHistory(account ?? null, false)
  const profile = useMemo(() => performanceProfile(history.summaries, PERIOD), [history.summaries])
  const subtitle = account ? `${formatRiotId(account.gameName, account.tagLine)} · ${gamesNote(profile).toLowerCase()}` : 'Your own games only'

  return (
    <Screen title="Performance" subtitle={subtitle}>
      {account ? <BackfillBar loaded={history.loaded} total={history.total} running={history.running} idsPending={history.idsPending} error={history.error} onStart={history.start} /> : null}
      {profile.games === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.15}>Load your games to see your performance</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={1.15}>Everything here is computed from your own Summoner's Rift games. Your recent Matches already count.</Text>
        </View>
      ) : (
        <>
          <OverviewCard profile={profile} />
          <RolesCard profile={profile} />
          <AreasCard profile={profile} />
          <ChampionsCard profile={profile} />
          <MatchupsCard profile={profile} />
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  cardTitle: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: font.body },
})
