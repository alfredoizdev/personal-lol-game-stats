import { StyleSheet, Text, View } from 'react-native'
import type { PlayerLine } from '@lpp/shared'
import { cmp, signed, type Cmp } from '@/lib/compare'
import { ChampionPortrait } from './ChampionPortrait'
import { CompareBar } from './CompareBar'
import { colors, font, radius, space } from '@/theme/tokens'

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

/**
 * One metric, you vs enemy, with the two-sided share bar underneath: the
 * side that did better takes more room (owner's request, 2026-10-22).
 */
function Row({ label, me, enemy, meNum, enemyNum, lowerIsBetter = false, delta, decimals = 0 }: {
  label: string
  me: string
  enemy: string
  meNum: number | null
  enemyNum: number | null
  lowerIsBetter?: boolean
  delta?: boolean
  decimals?: number
}) {
  const better: Cmp = cmp(meNum, enemyNum, lowerIsBetter)
  const d = delta ? signed(meNum, enemyNum, decimals) : undefined
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={[styles.cell, better === 'me' && styles.me]}>{me}</Text>
        <View style={styles.labelBlock}>
          <Text style={styles.label}>{label}</Text>
          {d ? <Text style={[styles.delta, better === 'me' ? styles.me : better === 'enemy' ? styles.enemy : null]}>{d}</Text> : null}
        </View>
        <Text style={[styles.cell, better === 'enemy' && styles.enemy]}>{enemy}</Text>
      </View>
      <CompareBar me={meNum} enemy={enemyNum} lowerIsBetter={lowerIsBetter} />
    </View>
  )
}

export function LaneMatchupCard({ me, opponent }: { me: PlayerLine; opponent: PlayerLine | null }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Lane Matchup</Text>
      {!opponent ? (
        <Text style={styles.muted}>Lane opponent not identified for this game.</Text>
      ) : (
        <>
          <View style={styles.heads}>
            <View style={styles.head}>
              <ChampionPortrait championName={me.championName} size={56} ring="you" />
              <Text style={[styles.headName, { color: colors.you }]}>You</Text>
              <Text style={styles.headChamp}>{me.championName}</Text>
            </View>
            <View style={styles.head}>
              <ChampionPortrait championName={opponent.championName} size={56} ring="enemy" />
              <Text style={[styles.headName, { color: colors.enemy }]}>Enemy</Text>
              <Text style={styles.headChamp}>{opponent.championName}</Text>
            </View>
          </View>
          <Row label="Kills" me={String(me.kills)} enemy={String(opponent.kills)} meNum={me.kills} enemyNum={opponent.kills} delta />
          <Row label="Deaths" me={String(me.deaths)} enemy={String(opponent.deaths)} meNum={me.deaths} enemyNum={opponent.deaths} lowerIsBetter delta />
          <Row label="CS" me={String(me.cs)} enemy={String(opponent.cs)} meNum={me.cs} enemyNum={opponent.cs} delta />
          <Row
            label="CS / min"
            me={me.csPerMin === null ? '—' : me.csPerMin.toFixed(1)}
            enemy={opponent.csPerMin === null ? '—' : opponent.csPerMin.toFixed(1)}
            meNum={me.csPerMin}
            enemyNum={opponent.csPerMin}
            delta
            decimals={1}
          />
          <Row label="Vision" me={String(me.visionScore)} enemy={String(opponent.visionScore)} meNum={me.visionScore} enemyNum={opponent.visionScore} delta />
          <Row label="Damage to champs" me={fmtK(me.damageToChampions)} enemy={fmtK(opponent.damageToChampions)} meNum={me.damageToChampions} enemyNum={opponent.damageToChampions} />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.xs },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800', marginBottom: space.xs },
  muted: { color: colors.muted, fontSize: font.body },
  heads: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm },
  head: { alignItems: 'center', gap: 2, width: 120 },
  headName: { fontSize: font.body, fontWeight: '800' },
  headChamp: { color: colors.muted, fontSize: font.caption },
  row: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  cell: { flex: 1, color: colors.text, fontSize: font.body, fontWeight: '700', textAlign: 'center' },
  me: { color: colors.you },
  enemy: { color: colors.enemy },
  labelBlock: { width: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { color: colors.muted, fontSize: font.caption + 1, textAlign: 'center' },
  delta: { fontSize: font.caption - 1, fontWeight: '700', color: colors.muted },
})
