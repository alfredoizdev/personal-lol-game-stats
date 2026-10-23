import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { banSuggestion, championSummary, roleSummary, toughestMatchups, ROLE_LABEL, type Role } from '@lpp/shared'
import { useChampionList } from '@/hooks/useChampionList'
import { useGoals } from '@/hooks/useGoals'
import { useOwnHistory } from '@/hooks/useOwnHistory'
import type { LinkedAccount } from '@/lib/linked-account'
import { useLiveFeed } from '@/lib/live-feed-context'
import { defaultRoles, loadRoles, saveRoles, type RolePair } from '@/lib/prematch-roles'
import { activeRole, prepareHeadline } from '@/lib/prepare-view'
import { colors, font, radius, space } from '@/theme/tokens'
import { BackfillBar } from './BackfillBar'
import { ChampionSummaryCard } from './ChampionSummaryCard'
import { GoalEditor } from './GoalEditor'
import { MatchupsTable } from './MatchupsTable'
import { RolePairPicker } from './RolePairPicker'

const roleWord = (r: Role) => (r === 'UTILITY' ? 'support' : r.toLowerCase())

/**
 * "Prepare your next game", by role (owner, 2026-10-23): you queue with two roles
 * and may get either, and a champion can be banned, so nothing here asks for a
 * champion. Your two roles → your record, toughest matchups and ban note for the
 * role shown → one goal for every game. In champion select the card follows the
 * assigned role and the locked champion by itself.
 */
export function PrepareCard({ account }: { account: LinkedAccount }) {
  const history = useOwnHistory(account, false)
  // One rule for every stats page: it loads its window (the last 100 games) by itself, once per account.
  const startedFor = useRef<string | null>(null)
  useEffect(() => {
    if (history.total === 0 || startedFor.current === account.puuid) return
    startedFor.current = account.puuid
    if (history.loaded < history.total) history.start()
  }, [account.puuid, history])
  const { champions } = useChampionList()
  const { goals, save, saving } = useGoals(account)

  // Your two roles: restored from the device, else from your own games the first time.
  const [roles, setRoles] = useState<RolePair | null>(null)
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    void loadRoles().then((pair) => {
      if (pair) setRoles(pair)
      setRestored(true)
    })
  }, [])
  useEffect(() => {
    if (restored && roles === null && history.summaries.length) setRoles(defaultRoles(history.summaries))
  }, [restored, roles, history.summaries])
  const changeRoles = (pair: RolePair) => {
    setRoles(pair)
    setViewing(null)
    void saveRoles(pair)
  }

  const { phase } = useLiveFeed()
  const pick = phase?.phase === 'ChampSelect' ? phase.pick ?? null : null
  const [viewing, setViewing] = useState<Role | null>(null)
  const pair = roles ?? { primary: 'MIDDLE' as Role, secondary: 'BOTTOM' as Role }
  const role = activeRole({ pick, viewing, primary: pair.primary })
  const pickedChampion = pick?.championId ? champions.find((c) => c.id === pick.championId) ?? null : null
  const headline = prepareHeadline(pick, pickedChampion?.name ?? null)

  const record = useMemo(
    () => (pickedChampion ? championSummary(history.summaries, pickedChampion.id, role) : roleSummary(history.summaries, role)),
    [history.summaries, pickedChampion, role],
  )
  // Display names from Data Dragon (Match-v5 carries internal names like "MonkeyKing").
  const displayName = (id: number, fallback: string) => champions.find((c) => c.id === id)?.name ?? fallback
  const allMatchups = useMemo(() => toughestMatchups(history.summaries, role, Infinity).map((r) => ({ ...r, championName: displayName(r.championId, r.championName) })), [history.summaries, role, champions])
  const matchups = allMatchups.slice(0, 5)
  const ban = banSuggestion(allMatchups, ROLE_LABEL[role])

  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Prepare your next game</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Your own games only.</Text>
      <BackfillBar loaded={history.loaded} total={history.total} running={history.running} idsPending={history.idsPending} error={history.error} onRetry={() => history.start()} />
      {headline ? (
        <View style={styles.headline}>
          <Text style={styles.headlineText} maxFontSizeMultiplier={1.15}>{headline}</Text>
          <Text style={styles.sub} maxFontSizeMultiplier={1.15}>{pick?.position ? 'From your champion select. Everything below is for this role.' : 'Waiting for your assigned role from the client.'}</Text>
        </View>
      ) : (
        <>
          <RolePairPicker value={pair} onChange={changeRoles} />
          {pair.primary !== pair.secondary ? (
            <View style={styles.showing}>
              <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Showing</Text>
              {[pair.primary, pair.secondary].map((r) => (
                <Pressable key={r} onPress={() => setViewing(r)} accessibilityRole="tab" accessibilityState={{ selected: r === role }} style={[styles.seg, r === role && styles.segOn]}>
                  <Text style={[styles.segText, r === role && styles.segTextOn]} maxFontSizeMultiplier={1.15}>{ROLE_LABEL[r]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
      <View style={styles.divider} />
      <Text style={styles.section} maxFontSizeMultiplier={1.15}>{pickedChampion ? `You with ${pickedChampion.name} as ${roleWord(role)}` : `You as ${roleWord(role)}`}</Text>
      <ChampionSummaryCard subject={pickedChampion ? `with ${pickedChampion.name} as ${roleWord(role)}` : `as ${roleWord(role)}`} summary={record} />
      <View style={styles.divider} />
      <GoalEditor summaries={history.summaries} goals={goals} puuid={account.puuid} role={role} onSave={save} saving={saving} />
      <View style={styles.divider} />
      <MatchupsTable rows={matchups} ban={ban} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption + 1 },
  section: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  headline: { gap: 2, paddingVertical: space.xs },
  headlineText: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  showing: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  seg: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
  segOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  segText: { color: colors.muted, fontSize: font.caption, fontWeight: '700' },
  segTextOn: { color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
})
