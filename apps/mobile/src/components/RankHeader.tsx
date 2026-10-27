import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { formatRiotId, rankCard, rankTier, type RankEntry, type RankedEntries } from '@lpp/shared'
import { SummonerAvatar } from './SummonerAvatar'
import type { LinkedAccount } from '@/lib/linked-account'
import { RANK_EMBLEM, UNRANKED_EMBLEM } from '@/lib/rank-emblems'
import { colors, font, radius, space } from '@/theme/tokens'

const EMBLEM_W = 64
const EMBLEM_H = EMBLEM_W * 0.6 // Riot's emblem PNGs are 200×120

/**
 * The Matches header, op.gg-style (owner, 2026-10-27): avatar with the summoner level,
 * the Riot ID, then one card per ranked queue — emblem, "Ranked Solo", tier, LP and the
 * record with its win rate. A queue without an entry shows the greyed unranked emblem.
 */
export function RankHeader({ account, rank, loading }: { account: LinkedAccount; rank: RankedEntries | null; loading: boolean }) {
  return (
    <View style={styles.block}>
      <Pressable onPress={() => router.push('/(app)/(tabs)/profile')} accessibilityRole="button" accessibilityLabel="Profile" style={styles.profile}>
        <SummonerAvatar account={account} size={64} level={rank?.level ?? null} />
        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{account.gameName}</Text>
          <Text style={styles.tag} numberOfLines={1}>{formatRiotId(account.gameName, account.tagLine)} · {account.region}</Text>
        </View>
      </Pressable>
      <View style={styles.cards}>
        <RankCard label="Ranked Solo" entry={rank?.solo ?? null} loading={loading} />
        <RankCard label="Ranked Flex" entry={rank?.flex ?? null} loading={loading} />
      </View>
    </View>
  )
}

function RankCard({ label, entry, loading }: { label: string; entry: RankEntry | null; loading: boolean }) {
  const tier = rankTier(entry?.tier ?? null)
  const card = rankCard(entry)
  const empty = !entry
  return (
    <View style={styles.card} accessibilityLabel={`${label}: ${loading ? 'loading' : `${card.name}${card.lp ? ` ${card.lp}` : ''}`}`}>
      <Image source={tier ? RANK_EMBLEM[tier] : UNRANKED_EMBLEM} style={[styles.emblem, (empty || loading) && styles.dim]} resizeMode="contain" />
      <View style={styles.text}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={[styles.tierName, empty && styles.mutedName]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{loading ? '…' : card.name}</Text>
        {card.lp ? <Text style={styles.lp} numberOfLines={1}>{card.lp}</Text> : null}
        {card.record ? <Text style={styles.record} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{card.record}</Text> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  who: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: font.title - 6, fontWeight: '800', letterSpacing: -0.5 },
  tag: { color: colors.you, fontSize: font.caption + 1, fontWeight: '600' },
  cards: { flexDirection: 'row', gap: space.sm },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm + 2, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card },
  emblem: { width: EMBLEM_W, height: EMBLEM_H, marginLeft: -4 },
  dim: { opacity: 0.35 },
  text: { flex: 1, gap: 1 },
  label: { color: colors.accent, fontSize: font.caption - 2, fontWeight: '700' },
  tierName: { color: colors.text, fontSize: font.body, fontWeight: '800', letterSpacing: -0.3 },
  mutedName: { color: colors.muted, fontWeight: '700' },
  lp: { color: colors.text, fontSize: font.caption, fontWeight: '600' },
  record: { color: colors.muted, fontSize: font.caption - 2 },
})
