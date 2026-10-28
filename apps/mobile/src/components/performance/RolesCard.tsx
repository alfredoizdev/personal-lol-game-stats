import { StyleSheet, Text, View } from 'react-native'
import { ROLE_LABEL, type PerformanceProfile, type Role } from '@lpp/shared'
import { RoleIcon } from '@/components/RoleIcon'
import { winRateColor } from '@/lib/performance-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/** One line per role played: games and win rate; the role you win most carries the ★ from Prepare (owner, 2026-10-27: no bars, no notes). */
export function RolesCard({ profile, best }: { profile: PerformanceProfile; best: Role | null }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Roles</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.15}>Your record in each role · ★ the one you win most</Text>
      {profile.roles.map((r) => (
        <View key={r.role} style={styles.row} accessibilityLabel={`${ROLE_LABEL[r.role]}: ${r.wins} wins ${r.games - r.wins} losses, ${r.winRate}% win rate${r.role === best ? ', your best role' : ''}`}>
          <RoleIcon role={r.role} size={20} />
          <Text style={styles.role} maxFontSizeMultiplier={1.15}>
            {ROLE_LABEL[r.role]}
            {r.role === best ? <Text style={styles.star}> ★</Text> : null}
          </Text>
          <Text style={styles.meta} maxFontSizeMultiplier={1.15}>
            {r.wins}W {r.games - r.wins}L · <Text style={{ color: winRateColor(r.winRate), fontWeight: '800' }}>{r.winRate}% win rate</Text>
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: 2 },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.caption, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  role: { flex: 1, color: colors.text, fontSize: font.body - 1, fontWeight: '700' },
  star: { color: colors.warn },
  meta: { color: colors.muted, fontSize: font.caption + 1 },
})
