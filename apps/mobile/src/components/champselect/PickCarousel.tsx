import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import type { PickCard } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { colors, font, radius, space } from '@/theme/tokens'

const fmt = (n: number | null, d: number) => (n === null ? '—' : n.toFixed(d))
const PEEK = 36 // the next card shows at the edge so the player knows to swipe
const MAX_W = 720 - 2 * space.md

function Card({ pick, index, width }: { pick: PickCard; index: number; width: number }) {
  const good = pick.winRate >= 50
  const tag = pick.reason === 'best' ? 'Best win rate' : 'Most played'
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.cardTop}>
        <View style={styles.rank}><Text style={styles.rankText} maxFontSizeMultiplier={1}>{index + 1}</Text></View>
        <ChampionPortrait championName={pick.championName} size={76} ring={good ? 'win' : 'loss'} />
        <View style={styles.cardText}>
          <Text style={styles.name} maxFontSizeMultiplier={1.1} numberOfLines={1}>{pick.championName}</Text>
          <View style={styles.tagRow}>
            <Text style={styles.tag} maxFontSizeMultiplier={1.1}>{tag}</Text>
            {pick.fewGames ? <Text style={styles.tagMuted} maxFontSizeMultiplier={1.1}>few games</Text> : null}
          </View>
        </View>
        <View style={styles.rateBlock}>
          <Text style={[styles.rate, { color: good ? colors.win : colors.loss }]} maxFontSizeMultiplier={1}>{pick.winRate}%</Text>
          <Text style={styles.rateLabel} maxFontSizeMultiplier={1.1}>win rate</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat value={`${pick.wins}W – ${pick.games - pick.wins}L`} label={`${pick.games} game${pick.games === 1 ? '' : 's'}`} />
        <View style={styles.divider} />
        <Stat value={fmt(pick.avgKda, 1)} label="KDA" />
        <View style={styles.divider} />
        <Stat value={fmt(pick.avgCsPerMin, 1)} label="CS / min" />
      </View>
    </View>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} maxFontSizeMultiplier={1.1}>{value}</Text>
      <Text style={styles.statLabel} maxFontSizeMultiplier={1.1}>{label}</Text>
    </View>
  )
}

/**
 * The three picks the app recommends for the role, as a swipeable carousel of big
 * cards (owner, 2026-10-23: "arriba grande como un carousel"). From the player's
 * own games only: best win rate with 3+ games first, then the most played.
 */
export function PickCarousel({ picks, roleLabel }: { picks: PickCard[]; roleLabel: string }) {
  const { width: windowW } = useWindowDimensions()
  const contentW = Math.min(windowW, 720) - 2 * space.md
  const cardW = picks.length > 1 ? Math.min(contentW, MAX_W) - PEEK : contentW
  const [page, setPage] = useState(0)
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / (cardW + space.sm)))
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>Your picks · {roleLabel}</Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.15}>From your own games</Text>
      </View>
      {picks.length === 0 ? (
        <View style={[styles.card, { width: contentW }]}>
          <Text style={styles.empty} maxFontSizeMultiplier={1.15}>No games of yours as {roleLabel} among your loaded games yet.</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardW + space.sm}
          decelerationRate="fast"
          onMomentumScrollEnd={onScroll}
          contentContainerStyle={styles.track}
          style={styles.scroller}
        >
          {picks.map((p, i) => <Card key={p.championId} pick={p} index={i} width={cardW} />)}
        </ScrollView>
      )}
      {picks.length > 1 ? (
        <View style={styles.dots}>
          {picks.map((p, i) => <View key={p.championId} style={[styles.dot, i === page && styles.dotOn]} />)}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  header: { gap: 2 },
  title: { color: colors.text, fontSize: font.body + 3, fontWeight: '900' },
  sub: { color: colors.muted, fontSize: font.caption },
  scroller: { marginHorizontal: -space.md },
  track: { paddingHorizontal: space.md, gap: space.sm },
  card: { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 1.5, borderRadius: radius.card, padding: space.md, gap: space.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rank: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: colors.text, fontSize: font.caption, fontWeight: '900' },
  cardText: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: font.body + 5, fontWeight: '900' },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { color: colors.text, fontSize: font.caption - 1, fontWeight: '700', backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tagMuted: { color: colors.muted, fontSize: font.caption - 1, fontWeight: '700', borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  rateBlock: { alignItems: 'flex-end' },
  rate: { fontSize: font.title, fontWeight: '900', lineHeight: font.title + 2 },
  rateLabel: { color: colors.muted, fontSize: font.caption - 1 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: font.caption - 1 },
  divider: { width: 1, backgroundColor: colors.border },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.accent, width: 16 },
  empty: { color: colors.muted, fontSize: font.body },
})
