import { StyleSheet, Text, View } from 'react-native'
import { formatKda, type LivePlayerV2, type MatchSummary } from '@lpp/shared'
import { ItemRow } from '@/components/ItemRow'
import { colors, font, radius, space } from '@/theme/tokens'

const int = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('en-US'))

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value} maxFontSizeMultiplier={1.1}>{value}</Text>
      <Text style={styles.label} maxFontSizeMultiplier={1.1}>{label}</Text>
      {sub ? <Text style={styles.sub} maxFontSizeMultiplier={1.1}>{sub}</Text> : null}
    </View>
  )
}

/**
 * Your final numbers for the game (owner, 2026-10-23: "esa pantalla debería
 * mostrar más stats"). The live snapshot gives the scoreboard values at once;
 * damage and gold come from the match record once Riot lists the game. The
 * deeper read (areas, phases, lane curves) stays in the match review.
 */
export function PostGameStats({ me, teamKills, summary }: { me: LivePlayerV2; teamKills: number | null; summary: MatchSummary | null }) {
  const review = summary?.me ?? null
  const k = review?.kills ?? me.kills
  const d = review?.deaths ?? me.deaths
  const a = review?.assists ?? me.assists
  const tk = summary?.teamKills ?? teamKills
  const kp = k !== null && a !== null && tk !== null && tk > 0 ? `${Math.round(((k + a) / tk) * 100)}%` : '—'
  const cs = review?.cs ?? me.cs
  const csPerMin = review?.csPerMin ?? me.csPerMin
  const vision = review?.visionScore ?? me.wardScore
  const level = review?.level ?? me.level
  const items = review ? review.items : me.items.slice(0, 6)
  const trinket = review ? review.trinket : me.items[6] ?? 0
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>Your numbers</Text>
        <ItemRow items={items} trinket={trinket} size={26} />
      </View>
      <View style={styles.grid}>
        <Stat value={k === null || d === null || a === null ? '—' : `${k} / ${d} / ${a}`} label="KDA" sub={k === null || d === null || a === null ? undefined : formatKda(k, d, a)} />
        <Stat value={kp} label="Kill participation" />
        <Stat value={csPerMin === null ? '—' : csPerMin.toFixed(1)} label="CS / min" sub={cs === null ? undefined : `${int(cs)} CS`} />
      </View>
      <View style={styles.grid}>
        <Stat value={int(vision)} label="Vision score" />
        <Stat value={int(level)} label="Level" />
        <Stat value={review ? int(review.damageToChampions) : '—'} label="Damage" sub={review ? `${int(review.gold)} gold` : 'with the review'} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' },
  title: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  grid: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, backgroundColor: colors.accentSoft, borderRadius: radius.control, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  value: { color: colors.text, fontSize: font.body + 2, fontWeight: '900' },
  label: { color: colors.muted, fontSize: font.caption - 1, textAlign: 'center' },
  sub: { color: colors.text, fontSize: font.caption - 1, fontWeight: '600' },
})
