import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { banSuggestion, championSummary, lastRole, playedChampions, toughestMatchups, type Role } from '@lpp/shared'
import { useChampionList } from '@/hooks/useChampionList'
import { useGoals } from '@/hooks/useGoals'
import { useOwnHistory } from '@/hooks/useOwnHistory'
import type { LinkedAccount } from '@/lib/linked-account'
import { loadSelection, saveSelection } from '@/lib/prematch-selection'
import { colors, font, radius, space } from '@/theme/tokens'
import { BackfillBar } from './BackfillBar'
import { ChampionPicker } from './ChampionPicker'
import { ChampionSummaryCard } from './ChampionSummaryCard'
import { GoalEditor } from './GoalEditor'
import { MatchupsTable } from './MatchupsTable'
import { ROLE_LABEL, RoleChips } from './RoleChips'

/** "Prepare your next game": champion + role → your own history → a goal (spec 2.1–2.4). */
export function PrepareCard({ account }: { account: LinkedAccount }) {
  const history = useOwnHistory(account, false)
  const { champions, byName } = useChampionList()
  const { goals, save, saving } = useGoals(account)
  const [role, setRole] = useState<Role | null>(null)
  const [championId, setChampionId] = useState<number | null>(null)
  const [restored, setRestored] = useState(false)

  // Restore the last pick first; only when there is none, default to the role of the newest game.
  useEffect(() => {
    void loadSelection().then((sel) => {
      if (sel) {
        setRole(sel.role)
        setChampionId(sel.championId)
      }
      setRestored(true)
    })
  }, [])
  useEffect(() => {
    if (restored && role === null && history.summaries.length) setRole(lastRole(history.summaries))
  }, [restored, role, history.summaries])
  useEffect(() => {
    if (restored && role && championId !== null) void saveSelection({ championId, role })
  }, [restored, role, championId])

  const effectiveRole: Role = role ?? 'MIDDLE'
  const played = useMemo(() => playedChampions(history.summaries, effectiveRole), [history.summaries, effectiveRole])
  const selected = champions.find((c) => c.id === championId) ?? null
  const summary = useMemo(() => (championId === null ? null : championSummary(history.summaries, championId, effectiveRole)), [history.summaries, championId, effectiveRole])
  // Display names from Data Dragon (Match-v5 carries internal names like "MonkeyKing").
  const displayName = (id: number, fallback: string) => champions.find((c) => c.id === id)?.name ?? fallback
  const allMatchups = useMemo(() => toughestMatchups(history.summaries, effectiveRole, Infinity), [history.summaries, effectiveRole])
  const matchups = useMemo(() => allMatchups.slice(0, 5).map((r) => ({ ...r, championName: displayName(r.championId, r.championName) })), [allMatchups, champions])
  const ban = banSuggestion(allMatchups.map((r) => ({ ...r, championName: displayName(r.championId, r.championName) })), ROLE_LABEL[effectiveRole])
  void byName

  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Prepare your next game</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Your own games only. Pick what you are about to play.</Text>
      <BackfillBar loaded={history.loaded} total={history.total} running={history.running} idsPending={history.idsPending} error={history.error} onStart={history.start} />
      <RoleChips value={effectiveRole} onChange={setRole} />
      <ChampionPicker champions={champions} played={played} selected={selected} onSelect={(c) => setChampionId(c.id)} />
      {selected && summary ? (
        <>
          <ChampionSummaryCard championName={selected.name} summary={summary} />
          <View style={styles.divider} />
          <GoalEditor
            key={`${selected.id}:${effectiveRole}`}
            summaries={history.summaries}
            goals={goals}
            puuid={account.puuid}
            championId={selected.id}
            championName={selected.name}
            role={effectiveRole}
            onSave={save}
            saving={saving}
          />
        </>
      ) : null}
      <View style={styles.divider} />
      <MatchupsTable rows={matchups} ban={ban} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption + 1 },
  divider: { height: 1, backgroundColor: colors.border },
})
