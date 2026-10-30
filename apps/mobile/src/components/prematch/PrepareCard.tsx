import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { banSuggestion, banPick, bestRole, championSummary, rankTier, roleSummary, toughestMatchups, ROLE_LABEL, type Role } from '@lpp/shared'
import { useChampionList } from '@/hooks/useChampionList'
import { useGoals } from '@/hooks/useGoals'
import { useRank } from '@/hooks/useRank'
import { useHistory } from '@/lib/history-context'
import type { LinkedAccount } from '@/lib/linked-account'
import { useLiveFeed } from '@/lib/live-feed-context'
import { activeRole, homeRole, pickedPortrait, prepareHeadline } from '@/lib/prepare-view'
import { loadViewRole, saveViewRole } from '@/lib/view-role'
import { colors, font, radius, space } from '@/theme/tokens'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { BackfillBar } from './BackfillBar'
import { ChampionSummaryCard } from './ChampionSummaryCard'
import { GoalEditor } from './GoalEditor'
import { RoleChips } from './RoleChips'

const roleWord = (r: Role) => (r === 'UTILITY' ? 'support' : r.toLowerCase())

/**
 * "Prepare your next game", by role (owner, 2026-10-23): you queue with two roles
 * and may get either, and a champion can be banned, so nothing here asks for a
 * champion and nothing has to be set up: the card shows your most played role
 * (tap another to look at it) → your record, one ban line when a rival qualifies →
 * one goal for every game. In champion select it follows the assigned role and
 * the locked champion by itself.
 */
export function PrepareCard({ account }: { account: LinkedAccount }) {
  const history = useHistory() // loaded once at launch, shared by every tab
  const { champions } = useChampionList()
  const { goals, save, saving } = useGoals(account)
  const { rank } = useRank(account)

  const { phase } = useLiveFeed()
  const pick = phase?.phase === 'ChampSelect' ? phase.pick ?? null : null
  // The role shown: champion select's, else the one you tapped to look at, else your most played. Nothing to set up.
  const [viewing, setViewing] = useState<Role | null>(null)
  useEffect(() => {
    void loadViewRole().then((r) => {
      if (r) setViewing(r)
    })
  }, [])
  const lookAt = (r: Role) => {
    setViewing(r)
    void saveViewRole(r)
  }
  const role = activeRole({ pick, viewing, primary: homeRole(history.summaries) })
  const best = useMemo(() => bestRole(history.summaries), [history.summaries])
  const pickedChampion = pick?.championId ? champions.find((c) => c.id === pick.championId) ?? null : null
  const headline = prepareHeadline(pick, pickedChampion?.name ?? null)
  const portrait = pickedPortrait(pick, pickedChampion)

  const record = useMemo(
    () => (pickedChampion ? championSummary(history.summaries, pickedChampion.id, role) : roleSummary(history.summaries, role)),
    [history.summaries, pickedChampion, role],
  )
  // Display names from Data Dragon (Match-v5 carries internal names like "MonkeyKing").
  const displayName = (id: number, fallback: string) => champions.find((c) => c.id === id)?.name ?? fallback
  const allMatchups = useMemo(() => toughestMatchups(history.summaries, role, Infinity).map((r) => ({ ...r, championName: displayName(r.championId, r.championName) })), [history.summaries, role, champions])
  // One ban line instead of the matchups table (owner, 2026-10-30): shown only when a lane opponent qualifies.
  const ban = banPick(allMatchups) ? banSuggestion(allMatchups, ROLE_LABEL[role]) : null

  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Prepare your next game</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Your own games only.</Text>
      <BackfillBar loaded={history.loaded} total={history.total} running={history.running} idsPending={history.idsPending} error={history.error} onRetry={() => history.start()} />
      {headline ? (
        <View style={styles.headline}>
          {portrait ? <ChampionPortrait championName={portrait} size={48} ring="you" /> : null}
          <View style={styles.headlineBody}>
            <Text style={styles.headlineText} maxFontSizeMultiplier={1.15}>{headline}</Text>
            <Text style={styles.sub} maxFontSizeMultiplier={1.15}>{pick?.position ? 'From your champion select. Everything below is for this role.' : 'Waiting for your assigned role from the client.'}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.showing}>
          <Text style={styles.sub} maxFontSizeMultiplier={1.15}>
            Showing {ROLE_LABEL[role]}{viewing ? '' : ' · your most played role'}.{best ? ` ★ ${ROLE_LABEL[best.role]} is where you win most: ${best.winRate} % over ${best.games} games.` : ''} Tap another to look at it; champion select sets it for you.
          </Text>
          <RoleChips value={role} onChange={lookAt} best={best?.role ?? null} />
        </View>
      )}
      <View style={styles.divider} />
      <Text style={styles.section} maxFontSizeMultiplier={1.15}>{pickedChampion ? `You with ${pickedChampion.name} as ${roleWord(role)}` : `You as ${roleWord(role)}`}</Text>
      <ChampionSummaryCard subject={pickedChampion ? `with ${pickedChampion.name} as ${roleWord(role)}` : `as ${roleWord(role)}`} summary={record} />
      <View style={styles.divider} />
      <GoalEditor summaries={history.summaries} goals={goals} puuid={account.puuid} role={role} onSave={save} saving={saving} tier={rankTier(rank?.solo?.tier ?? null)} />
      {ban ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.ban} maxFontSizeMultiplier={1.15}>{ban}</Text>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption + 1 },
  section: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  headline: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  headlineBody: { flex: 1, gap: 2 },
  headlineText: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  showing: { gap: 8, paddingTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
  ban: { color: colors.text, fontSize: font.body - 1, fontWeight: '600' },
})
