import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { formatRank, formatRiotId, rankCard, rankTier, type RankedEntries } from '@lpp/shared'
import { SummonerAvatar } from './SummonerAvatar'
import type { LinkedAccount } from '@/lib/linked-account'
import { RANK_EMBLEM, UNRANKED_EMBLEM } from '@/lib/rank-emblems'
import { colors, font, space } from '@/theme/tokens'

const EMBLEM_W = 92
const EMBLEM_H = EMBLEM_W * 0.6 // Riot's emblem PNGs are 200×120

/**
 * The Matches header (owner, 2026-10-27: no big title, the rank emblem instead):
 * Riot's emblem for the Solo/Duo tier, the Riot ID, the tier name and the LP / record line.
 * Flex rank shows as a muted line only when it exists. The avatar on the right opens Profile.
 */
export function RankHeader({ account, rank, loading }: { account: LinkedAccount; rank: RankedEntries | null; loading: boolean }) {
  const tier = rankTier(rank?.solo?.tier ?? null)
  const card = rankCard(rank?.solo ?? null)
  return (
    <View style={styles.row}>
      <Image source={tier ? RANK_EMBLEM[tier] : UNRANKED_EMBLEM} style={[styles.emblem, loading && styles.dim]} resizeMode="contain" accessibilityLabel={`${card.name} emblem`} />
      <View style={styles.text}>
        <Text style={styles.summoner} numberOfLines={1}>{formatRiotId(account.gameName, account.tagLine)}</Text>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{loading ? 'Checking rank…' : card.name}</Text>
        {loading ? null : <Text style={styles.standing} numberOfLines={1} maxFontSizeMultiplier={1.15}>{card.standing}</Text>}
        {rank?.flex ? <Text style={styles.flex} numberOfLines={1}>Flex {formatRank(rank.flex)}</Text> : null}
      </View>
      <Pressable onPress={() => router.push('/(app)/(tabs)/profile')} accessibilityRole="button" accessibilityLabel="Profile" hitSlop={8}>
        <SummonerAvatar account={account} size={52} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  emblem: { width: EMBLEM_W, height: EMBLEM_H, marginLeft: -6 },
  dim: { opacity: 0.4 },
  text: { flex: 1, gap: 1 },
  summoner: { color: colors.you, fontSize: font.caption + 1, fontWeight: '700' },
  name: { color: colors.text, fontSize: font.title - 6, fontWeight: '800', letterSpacing: -0.5 },
  standing: { color: colors.muted, fontSize: font.caption, fontWeight: '600' },
  flex: { color: colors.muted, fontSize: font.caption - 1, marginTop: 2 },
})
