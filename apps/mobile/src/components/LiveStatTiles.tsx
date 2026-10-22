import { StyleSheet, Text, View } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import type { LivePlayerV2 } from '@lpp/shared'
import { colors, font, radius, space } from '@/theme/tokens'

function Tile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <View style={styles.tile}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>{icon}</View>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  )
}

/** Own-performance tiles: KP, vision score, level. Scoreboard-visible numbers only. */
export function LiveStatTiles({ me, teamKills }: { me: LivePlayerV2; teamKills: number | null }) {
  const kp = teamKills && teamKills > 0 && me.kills !== null && me.assists !== null ? `${Math.round(((me.kills + me.assists) / teamKills) * 100)}%` : '—'
  return (
    <View style={styles.row}>
      <Tile icon={<MaterialCommunityIcons name="sword-cross" size={16} color={colors.accent} />} label="KP" value={kp} accent={colors.accent} />
      <Tile icon={<Ionicons name="eye-outline" size={16} color={colors.you} />} label="Vision" value={me.wardScore === null ? '—' : String(me.wardScore)} accent={colors.you} />
      <Tile icon={<Ionicons name="bar-chart-outline" size={16} color={colors.win} />} label="Level" value={me.level === null ? '—' : String(me.level)} accent={colors.win} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card - 4, padding: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.muted, fontSize: font.caption - 1 },
  value: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
})
