import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { formatRiotId, performanceProfile, type Period } from '@lpp/shared'
import { Screen } from '@/components/Screen'
import { AreasCard } from '@/components/performance/AreasCard'
import { ChampionsCard } from '@/components/performance/ChampionsCard'
import { MatchupsCard } from '@/components/performance/MatchupsCard'
import { OverviewCard } from '@/components/performance/OverviewCard'
import { RolesCard } from '@/components/performance/RolesCard'
import { PeriodChips } from '@/components/performance/PeriodChips'
import { BackfillBar } from '@/components/prematch/BackfillBar'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { useOwnHistory } from '@/hooks/useOwnHistory'
import { colors, font, radius, space } from '@/theme/tokens'

/** Your performance from your own cached games: no new Riot calls (Phase 6 spec). */
export default function PerformanceScreen() {
  const { data: account } = useLinkedAccount()
  const history = useOwnHistory(account ?? null, false)
  const [period, setPeriod] = useState<Period>(20)
  const profile = useMemo(() => performanceProfile(history.summaries, period), [history.summaries, period])

  return (
    <Screen title="Performance" subtitle={account ? formatRiotId(account.gameName, account.tagLine) : 'Your own games only'}>
      {account ? <BackfillBar loaded={history.loaded} total={history.total} running={history.running} idsPending={history.idsPending} error={history.error} onStart={history.start} /> : null}
      <PeriodChips value={period} onChange={setPeriod} />
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
