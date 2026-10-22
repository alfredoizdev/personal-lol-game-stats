import { StyleSheet, Text, View } from 'react-native'
import type { LivePlayerV2 } from '@lpp/shared'
import { colors, font, radius, space } from '@/theme/tokens'

type Cmp = 'me' | 'enemy' | 'tie'
function cmp(a: number | null, b: number | null): Cmp {
  if (a === null || b === null || a === b) return 'tie'
  return a > b ? 'me' : 'enemy'
}
const fmt = (n: number | null, d = 0) => (n === null ? '—' : n.toFixed(d))

function Row({ label, me, enemy, better }: { label: string; me: string; enemy: string; better: Cmp }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.cell, better === 'me' && styles.me]}>{me}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.cell, better === 'enemy' && styles.enemy]}>{enemy}</Text>
    </View>
  )
}

export function LiveMatchupTable({ me, opponent, teamKills }: { me: LivePlayerV2; opponent: LivePlayerV2 | null; teamKills: number | null }) {
  const kp = teamKills && teamKills > 0 && me.kills !== null && me.assists !== null ? Math.round(((me.kills + me.assists) / teamKills) * 100) : null
  const kda = (p: LivePlayerV2) => (p.kills === null ? '—' : `${p.kills}/${p.deaths ?? '—'}/${p.assists ?? '—'}`)
  const csLead = me.cs !== null && opponent?.cs !== null && opponent ? me.cs - opponent.cs : null
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Lane Matchup</Text>
        {csLead !== null ? (
          <View style={[styles.chip, { borderColor: csLead >= 0 ? colors.win : colors.loss }]}>
            <Text style={[styles.chipText, { color: csLead >= 0 ? colors.win : colors.loss }]}>{csLead >= 0 ? '+' : ''}{csLead} CS</Text>
          </View>
        ) : null}
      </View>
      {opponent ? (
        <>
          <Row label="KDA" me={kda(me)} enemy={kda(opponent)} better="tie" />
          <Row label="CS" me={fmt(me.cs)} enemy={fmt(opponent.cs)} better={cmp(me.cs, opponent.cs)} />
          <Row label="CS / min" me={fmt(me.csPerMin, 1)} enemy={fmt(opponent.csPerMin, 1)} better={cmp(me.csPerMin, opponent.csPerMin)} />
          <Row label="Level" me={fmt(me.level)} enemy={fmt(opponent.level)} better={cmp(me.level, opponent.level)} />
          <Row label="Vision" me={fmt(me.wardScore)} enemy={fmt(opponent.wardScore)} better={cmp(me.wardScore, opponent.wardScore)} />
        </>
      ) : (
        <>
          <Row label="KDA" me={kda(me)} enemy="" better="tie" />
          <Row label="CS" me={fmt(me.cs)} enemy="" better="tie" />
          <Row label="CS / min" me={fmt(me.csPerMin, 1)} enemy="" better="tie" />
          <Row label="Level" me={fmt(me.level)} enemy="" better="tie" />
          <Row label="Vision" me={fmt(me.wardScore)} enemy="" better="tie" />
        </>
      )}
      <View style={styles.kpRow}>
        <Text style={styles.kpLabel}>Kill participation</Text>
        <Text style={styles.kpValue}>{kp === null ? '—' : `${kp}%`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: font.caption, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  cell: { flex: 1, color: colors.text, fontSize: font.body, fontWeight: '700', textAlign: 'center' },
  me: { color: colors.you },
  enemy: { color: colors.enemy },
  label: { width: 90, textAlign: 'center', color: colors.muted, fontSize: font.caption + 1 },
  kpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
  kpLabel: { color: colors.muted, fontSize: font.caption + 1 },
  kpValue: { color: colors.text, fontSize: font.body, fontWeight: '800' },
})
