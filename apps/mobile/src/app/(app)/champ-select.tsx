import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { banSuggestion, championSummary, formatGoal, goalFor, META_BANS, metaBansFor, recommendedPicks, ROLE_LABEL, toughestMatchups, type Role } from '@lpp/shared'
import { Screen } from '@/components/Screen'
import { BanList } from '@/components/champselect/BanList'
import { MetaBanChips } from '@/components/champselect/MetaBanChips'
import { PickList } from '@/components/champselect/PickList'
import { ChampionSummaryCard } from '@/components/prematch/ChampionSummaryCard'
import { useChampionList } from '@/hooks/useChampionList'
import { useGoals } from '@/hooks/useGoals'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { useHistory } from '@/lib/history-context'
import { useLiveFeed } from '@/lib/live-feed-context'
import { homeRole, prepareHeadline } from '@/lib/prepare-view'
import { loadViewRole } from '@/lib/view-role'
import { colors, font, radius, space } from '@/theme/tokens'

const roleWord = (r: Role) => (r === 'UTILITY' ? 'support' : r.toLowerCase())

/**
 * Champion select (owner, 2026-10-23): bans from your games, the meta ban list,
 * your picks for the assigned role, and once locked, your record on the champion
 * and the goal that will apply. Own cell only; sentences, never orders.
 */
export default function ChampSelectScreen() {
  const { phase } = useLiveFeed()
  const { data: account } = useLinkedAccount()
  const history = useHistory()
  const { goals } = useGoals(account ?? null)
  const { champions } = useChampionList()
  const [viewing, setViewing] = useState<Role | null>(null)
  useEffect(() => {
    void loadViewRole().then((r) => {
      if (r) setViewing(r)
    })
  }, [])

  const pick = phase?.phase === 'ChampSelect' ? phase.pick ?? null : null
  const role: Role = pick?.position ?? viewing ?? homeRole(history.summaries)
  const champion = pick?.championId ? champions.find((c) => c.id === pick.championId) ?? null : null
  const headline = prepareHeadline(pick ?? { championId: null, position: null }, champion?.name ?? null) ?? 'Champion select'
  const displayName = (id: number, fallback: string) => champions.find((c) => c.id === id)?.name ?? fallback

  const matchups = useMemo(() => toughestMatchups(history.summaries, role, Infinity).map((r) => ({ ...r, championName: displayName(r.championId, r.championName) })), [history.summaries, role, champions])
  const picks = useMemo(() => {
    const p = recommendedPicks(history.summaries, role)
    const name = (r: (typeof p.best)[number]) => ({ ...r, championName: displayName(r.championId, r.championName) })
    return { best: p.best.map(name), mostPlayed: p.mostPlayed.map(name) }
  }, [history.summaries, role, champions])
  const record = champion ? championSummary(history.summaries, champion.id, role) : null
  const goal = account ? goalFor(goals, account.puuid, champion?.id ?? null, role) : null

  return (
    <Screen
      title={headline}
      subtitle={pick?.position ? `Your assigned role · ${ROLE_LABEL[role]}` : `Showing ${ROLE_LABEL[role]} until the client assigns your role`}
      right={
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={styles.close}>
          <Text style={styles.closeText} maxFontSizeMultiplier={1.15}>Close</Text>
        </Pressable>
      }
    >
      {champion && record ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.15}>You with {champion.name} as {roleWord(role)}</Text>
          <ChampionSummaryCard subject={`with ${champion.name} as ${roleWord(role)}`} summary={record} />
          {goal ? <Text style={styles.goal} maxFontSizeMultiplier={1.15}>Goal for this game: {formatGoal(goal)}</Text> : null}
        </View>
      ) : null}
      <BanList rows={matchups.slice(0, 5)} sentence={banSuggestion(matchups, ROLE_LABEL[role])} />
      <MetaBanChips rows={metaBansFor(role)} updatedOn={META_BANS.updatedOn} />
      <PickList best={picks.best} mostPlayed={picks.mostPlayed} />
      <Text style={styles.footnote} maxFontSizeMultiplier={1.15}>From your own last {history.total} games. This screen closes by itself when the game loads.</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  close: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  closeText: { color: colors.text, fontSize: font.caption + 1, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  cardTitle: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  goal: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  footnote: { color: colors.muted, fontSize: font.caption },
})
