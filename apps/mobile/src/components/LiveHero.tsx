import { StyleSheet, Text, View } from 'react-native'
import { formatDuration, type LiveSnapshotV2 } from '@lpp/shared'
import { ChampionPortrait } from './ChampionPortrait'
import { ItemRow } from './ItemRow'
import { colors, font, radius, space } from '@/theme/tokens'

const ROLE_LABEL: Record<string, string> = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support' }

function Side({ p, who, ring }: { p: LiveSnapshotV2['me']; who: 'You' | 'Enemy'; ring: 'you' | 'enemy' }) {
  return (
    <View style={styles.side}>
      <ChampionPortrait championName={p.championName} size={64} ring={ring} />
      <Text style={[styles.who, { color: ring === 'you' ? colors.you : colors.enemy }]}>{who}</Text>
      <Text style={styles.champ} numberOfLines={1}>{p.championName || '—'}</Text>
      <Text style={styles.meta}>{p.position ? ROLE_LABEL[p.position] : ''}</Text>
      <ItemRow items={p.items.slice(0, 6)} trinket={p.items[6] ?? 0} size={20} />
    </View>
  )
}

export function LiveHero({ snapshot, badge }: { snapshot: LiveSnapshotV2; badge: 'LIVE' | 'DEMO' | 'RECONNECTING' | 'ENDED' }) {
  const badgeColor = badge === 'LIVE' || badge === 'DEMO' ? colors.enemy : badge === 'RECONNECTING' ? colors.warn : colors.muted
  return (
    <View style={styles.card}>
      <Side p={snapshot.me} who="You" ring="you" />
      <View style={styles.center}>
        <View style={[styles.badge, { borderColor: badgeColor }]}>
          <View style={[styles.dot, { backgroundColor: badgeColor }]} />
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
        <Text style={styles.timer}>{snapshot.gameTimeSeconds === null ? '--:--' : formatDuration(snapshot.gameTimeSeconds)}</Text>
        <Text style={styles.goalLabel}>Personal goal</Text>
        <Text style={styles.goal}>{snapshot.focus ? `Keep ${snapshot.focus.target.toFixed(1)}+ CS/min` : 'Not set'}</Text>
      </View>
      {snapshot.opponent ? (
        <Side p={snapshot.opponent} who="Enemy" ring="enemy" />
      ) : (
        <View style={styles.side}>
          <Text style={styles.meta}>Lane opponent{'\n'}not identified</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  side: { flex: 1, alignItems: 'center', gap: 4 },
  center: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 6 },
  who: { fontSize: font.body, fontWeight: '800' },
  champ: { color: colors.text, fontSize: font.caption + 1 },
  meta: { color: colors.muted, fontSize: font.caption, textAlign: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: font.caption, fontWeight: '800', letterSpacing: 1 },
  timer: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  goalLabel: { color: colors.muted, fontSize: font.caption - 1, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  goal: { color: colors.accent, fontSize: font.caption + 2, fontWeight: '700', textAlign: 'center' },
})
