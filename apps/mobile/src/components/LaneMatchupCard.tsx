import { StyleSheet, Text, View } from 'react-native'
import type { PlayerLine } from '@lpp/shared'
import { ChampionPortrait } from './ChampionPortrait'
import { colors, font, radius, space } from '@/theme/tokens'

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

function Row({ label, me, enemy, better }: { label: string; me: string; enemy: string; better: 'me' | 'enemy' | 'tie' }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.me, better === 'me' && styles.highlightMe]}>{me}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.cell, styles.enemy, better === 'enemy' && styles.highlightEnemy]}>{enemy}</Text>
    </View>
  )
}

function cmp(a: number, b: number): 'me' | 'enemy' | 'tie' {
  return a === b ? 'tie' : a > b ? 'me' : 'enemy'
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
          <Row label="Kills" me={String(me.kills)} enemy={String(opponent.kills)} better={cmp(me.kills, opponent.kills)} />
          <Row label="CS" me={String(me.cs)} enemy={String(opponent.cs)} better={cmp(me.cs, opponent.cs)} />
          <Row
            label="CS / min"
            me={me.csPerMin === null ? '—' : me.csPerMin.toFixed(1)}
            enemy={opponent.csPerMin === null ? '—' : opponent.csPerMin.toFixed(1)}
            better={cmp(me.csPerMin ?? 0, opponent.csPerMin ?? 0)}
          />
          <Row label="Vision" me={String(me.visionScore)} enemy={String(opponent.visionScore)} better={cmp(me.visionScore, opponent.visionScore)} />
          <Row label="Damage to Champs" me={fmtK(me.damageToChampions)} enemy={fmtK(opponent.damageToChampions)} better={cmp(me.damageToChampions, opponent.damageToChampions)} />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800', marginBottom: space.xs },
  muted: { color: colors.muted, fontSize: font.body },
  heads: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm },
  head: { alignItems: 'center', gap: 2, width: 120 },
  headName: { fontSize: font.body, fontWeight: '800' },
  headChamp: { color: colors.muted, fontSize: font.caption },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  cell: { flex: 1, fontSize: font.body, fontWeight: '700', textAlign: 'center' },
  me: { color: colors.text },
  enemy: { color: colors.text },
  highlightMe: { color: colors.you },
  highlightEnemy: { color: colors.enemy },
  label: { width: 120, textAlign: 'center', color: colors.muted, fontSize: font.caption + 1 },
})
