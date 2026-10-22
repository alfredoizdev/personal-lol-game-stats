import { Image, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { championLoadingArtUrl, formatDuration, type LiveSnapshotV2 } from '@lpp/shared'
import { ChampionPortrait } from './ChampionPortrait'
import { ItemRow } from './ItemRow'
import { colors, font, radius, space } from '@/theme/tokens'

const ROLE_LABEL: Record<string, string> = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' }

function Side({ p, who, ring, align }: { p: LiveSnapshotV2['me']; who: 'You' | 'Enemy'; ring: 'you' | 'enemy'; align: 'left' | 'right' }) {
  const color = ring === 'you' ? colors.you : colors.enemy
  return (
    <View style={[styles.side, align === 'right' && styles.sideRight]}>
      <ChampionPortrait championName={p.championName} size={68} ring={ring} />
      <Text style={[styles.who, { color }]}>{who}</Text>
      <Text style={styles.champ} numberOfLines={1}>{p.championName || '—'}</Text>
      <Text style={styles.meta}>{p.position ? ROLE_LABEL[p.position] : ' '}</Text>
      <View style={styles.items}>
        <ItemRow items={p.items.slice(0, 6)} trinket={p.items[6] ?? 0} size={20} />
      </View>
    </View>
  )
}

export function LiveHero({ snapshot, badge }: { snapshot: LiveSnapshotV2; badge: 'LIVE' | 'DEMO' | 'RECONNECTING' | 'ENDED' }) {
  const badgeColor = badge === 'LIVE' || badge === 'DEMO' ? colors.enemy : badge === 'RECONNECTING' ? colors.warn : colors.muted
  const op = snapshot.opponent
  return (
    <View style={styles.card}>
      {/* Champion art as a dim backdrop: yours on the left, the enemy's on the right. */}
      <View style={styles.artRow} pointerEvents="none">
        <Image source={{ uri: championLoadingArtUrl(snapshot.me.championName) }} style={styles.art} blurRadius={1} />
        {op ? <Image source={{ uri: championLoadingArtUrl(op.championName) }} style={styles.art} blurRadius={1} /> : <View style={styles.art} />}
      </View>
      <LinearGradient colors={['rgba(11,10,31,0.35)', 'rgba(11,10,31,0.88)', 'rgba(11,10,31,0.97)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.content}>
        <Side p={snapshot.me} who="You" ring="you" align="left" />
        <View style={styles.center}>
          <View style={[styles.badge, { borderColor: badgeColor, backgroundColor: 'rgba(11,10,31,0.6)' }]}>
            <View style={[styles.dot, { backgroundColor: badgeColor }]} />
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
          <Text style={styles.timer}>{snapshot.gameTimeSeconds === null ? '--:--' : formatDuration(snapshot.gameTimeSeconds)}</Text>
          <View style={styles.vsLine} />
          <Text style={styles.goalLabel}>Personal goal</Text>
          <Text style={styles.goal}>{snapshot.focus ? `Keep ${snapshot.focus.target.toFixed(1)}+ CS/min` : 'Not set'}</Text>
        </View>
        {op ? (
          <Side p={op} who="Enemy" ring="enemy" align="right" />
        ) : (
          <View style={[styles.side, styles.sideRight]}>
            <Text style={styles.meta}>Lane opponent{'\n'}not identified</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSolid },
  artRow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  art: { flex: 1, height: '100%', opacity: 0.55 },
  content: { flexDirection: 'row', alignItems: 'flex-start', padding: space.md, gap: space.sm },
  side: { flex: 1, alignItems: 'center', gap: 3 },
  sideRight: {},
  center: { flex: 1.1, alignItems: 'center', gap: 4, paddingTop: 8 },
  who: { fontSize: font.body + 1, fontWeight: '800', letterSpacing: -0.2 },
  champ: { color: colors.text, fontSize: font.caption + 1, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: font.caption, textAlign: 'center' },
  items: { marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: font.caption, fontWeight: '800', letterSpacing: 1.2 },
  timer: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  vsLine: { width: 40, height: 2, borderRadius: 1, backgroundColor: colors.accent, opacity: 0.8, marginVertical: 2 },
  goalLabel: { color: colors.muted, fontSize: font.caption - 1, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 },
  goal: { color: colors.accent, fontSize: font.caption + 2, fontWeight: '700', textAlign: 'center' },
})
