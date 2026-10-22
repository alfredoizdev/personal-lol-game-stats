import { StyleSheet, Text, View } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import type { LivePlayerV2 } from '@lpp/shared'
import { ChampionPortrait } from './ChampionPortrait'
import { colors, font, radius, space } from '@/theme/tokens'

type Cmp = 'me' | 'enemy' | 'tie'
function cmp(a: number | null, b: number | null): Cmp {
  if (a === null || b === null || a === b) return 'tie'
  return a > b ? 'me' : 'enemy'
}
const fmt = (n: number | null, d = 0) => (n === null ? '—' : n.toFixed(d))
const kda = (p: LivePlayerV2) => (p.kills === null ? '—' : `${p.kills}/${p.deaths ?? '—'}/${p.assists ?? '—'}`)

function Row({ icon, label, me, enemy, better, last }: { icon: React.ReactNode; label: string; me: string; enemy: string; better: Cmp; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={[styles.cell, better === 'me' && styles.me]}>{me}</Text>
      <View style={styles.labelBlock}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.cell, better === 'enemy' && styles.enemy]}>{enemy}</Text>
    </View>
  )
}

const ICON = (name: React.ComponentProps<typeof MaterialCommunityIcons>['name']) => <MaterialCommunityIcons name={name} size={14} color={colors.muted} />
const ION = (name: React.ComponentProps<typeof Ionicons>['name']) => <Ionicons name={name} size={14} color={colors.muted} />

export function LiveMatchupTable({ me, opponent }: { me: LivePlayerV2; opponent: LivePlayerV2 | null }) {
  const csLead = me.cs !== null && opponent && opponent.cs !== null ? me.cs - opponent.cs : null
  const e = opponent
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="sword-cross" size={18} color={colors.accent} />
          <Text style={styles.title}>Lane Matchup</Text>
        </View>
        {csLead !== null ? (
          <View style={[styles.chip, { borderColor: csLead >= 0 ? colors.win : colors.loss, backgroundColor: csLead >= 0 ? 'rgba(45,212,166,0.12)' : 'rgba(251,92,122,0.12)' }]}>
            <MaterialCommunityIcons name={csLead >= 0 ? 'trending-up' : 'trending-down'} size={14} color={csLead >= 0 ? colors.win : colors.loss} />
            <Text style={[styles.chipText, { color: csLead >= 0 ? colors.win : colors.loss }]}>
              {csLead >= 0 ? '+' : ''}{csLead} CS {csLead >= 0 ? 'lead' : 'behind'}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.heads}>
        <View style={styles.head}>
          <ChampionPortrait championName={me.championName} size={40} ring="you" />
          <Text style={[styles.headName, { color: colors.you }]}>You</Text>
        </View>
        <View style={styles.headSpacer} />
        <View style={styles.head}>
          {e ? <ChampionPortrait championName={e.championName} size={40} ring="enemy" /> : <View style={{ width: 40, height: 40 }} />}
          <Text style={[styles.headName, { color: colors.enemy }]}>{e ? 'Enemy' : '—'}</Text>
        </View>
      </View>
      <Row icon={ICON('sword-cross')} label="KDA" me={kda(me)} enemy={e ? kda(e) : ''} better="tie" />
      <Row icon={ICON('diamond-stone')} label="CS" me={fmt(me.cs)} enemy={e ? fmt(e.cs) : ''} better={e ? cmp(me.cs, e.cs) : 'tie'} />
      <Row icon={ION('time-outline')} label="CS / min" me={fmt(me.csPerMin, 1)} enemy={e ? fmt(e.csPerMin, 1) : ''} better={e ? cmp(me.csPerMin, e.csPerMin) : 'tie'} />
      <Row icon={ION('bar-chart-outline')} label="Level" me={fmt(me.level)} enemy={e ? fmt(e.level) : ''} better={e ? cmp(me.level, e.level) : 'tie'} />
      <Row icon={ION('eye-outline')} label="Vision" me={fmt(me.wardScore)} enemy={e ? fmt(e.wardScore) : ''} better={e ? cmp(me.wardScore, e.wardScore) : 'tie'} last />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: font.caption, fontWeight: '800' },
  heads: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  head: { flex: 1, alignItems: 'center', gap: 2 },
  headSpacer: { width: 96 },
  headName: { fontSize: font.caption + 1, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  rowLast: { borderBottomWidth: 1, borderBottomColor: colors.border },
  cell: { flex: 1, color: colors.text, fontSize: font.body, fontWeight: '700', textAlign: 'center' },
  me: { color: colors.you },
  enemy: { color: colors.enemy },
  labelBlock: { width: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { color: colors.muted, fontSize: font.caption + 1 },
})
