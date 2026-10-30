import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { champSelectBans, champSelectPicks, championSummary, formatGoal, goalFor, META_BANS, metaBansFor, ROLE_LABEL, toughestMatchups, type Role } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { Screen } from '@/components/Screen'
import { BanGrid } from '@/components/champselect/BanGrid'
import { PickCarousel } from '@/components/champselect/PickCarousel'
import { ChampionSummaryCard } from '@/components/prematch/ChampionSummaryCard'
import { useChampionList } from '@/hooks/useChampionList'
import { useGoals } from '@/hooks/useGoals'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { useHistory } from '@/lib/history-context'
import { useLiveFeed } from '@/lib/live-feed-context'
import { homeRole, pickedPortrait, prepareHeadline } from '@/lib/prepare-view'
import { loadViewRole } from '@/lib/view-role'
import { colors, font, radius, space } from '@/theme/tokens'

const roleWord = (r: Role) => (r === 'UTILITY' ? 'support' : r.toLowerCase())

/**
 * Champion select (owner, 2026-10-23): three picks for the assigned role as a big
 * carousel on top, six bans to consider (three from your games, three from the
 * meta list), and once locked, your record on the champion and the goal that will
 * apply in place of the picks. Own cell only; statements, never orders.
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
  const portrait = pickedPortrait(pick, champion)
  const displayName = (id: number, fallback: string) => champions.find((c) => c.id === id)?.name ?? fallback

  const matchups = useMemo(() => toughestMatchups(history.summaries, role, Infinity).map((r) => ({ ...r, championName: displayName(r.championId, r.championName) })), [history.summaries, role, champions])
  const bans = useMemo(() => champSelectBans(matchups, metaBansFor(role)), [matchups, role])
  const picks = useMemo(() => champSelectPicks(history.summaries, role).map((r) => ({ ...r, championName: displayName(r.championId, r.championName) })), [history.summaries, role, champions])
  const record = champion ? championSummary(history.summaries, champion.id, role) : null
  const goal = account ? goalFor(goals, account.puuid, champion?.id ?? null, role) : null

  return (
    <Screen
      title="Champion select"
      subtitle={pick?.position ? `Your assigned role · ${ROLE_LABEL[role]}` : `Showing ${ROLE_LABEL[role]} until the client assigns your role`}
      right={
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={styles.close}>
          <Text style={styles.closeText} maxFontSizeMultiplier={1.15}>Close</Text>
        </Pressable>
      }
    >
      {champion && record ? (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            {portrait ? <ChampionPortrait championName={portrait} size={56} ring="you" /> : null}
            <View style={styles.cardHeadText}>
              <Text style={styles.cardTitle} maxFontSizeMultiplier={1.15}>{headline}</Text>
              <Text style={styles.cardSub} maxFontSizeMultiplier={1.15}>You with {champion.name} as {roleWord(role)}</Text>
            </View>
          </View>
          <ChampionSummaryCard subject={`with ${champion.name} as ${roleWord(role)}`} summary={record} />
          {goal ? <Text style={styles.goal} maxFontSizeMultiplier={1.15}>Goal for this game: {formatGoal(goal)}</Text> : null}
        </View>
      ) : (
        <PickCarousel picks={picks} roleLabel={ROLE_LABEL[role]} />
      )}
      <BanGrid bans={bans} roleLabel={ROLE_LABEL[role]} updatedOn={META_BANS.updatedOn} />
      <Text style={styles.footnote} maxFontSizeMultiplier={1.15}>From your own last {history.total} games. This screen closes by itself when the game loads.</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  close: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  closeText: { color: colors.text, fontSize: font.caption + 1, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardHeadText: { flex: 1, gap: 2 },
  cardTitle: { color: colors.text, fontSize: font.body + 3, fontWeight: '800' },
  cardSub: { color: colors.muted, fontSize: font.caption + 1 },
  goal: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  footnote: { color: colors.muted, fontSize: font.caption },
})
