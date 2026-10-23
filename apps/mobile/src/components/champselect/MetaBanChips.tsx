import { StyleSheet, Text, View } from 'react-native'
import type { MetaBan } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { colors, font, radius, space } from '@/theme/tokens'

/** The curated meta list for the role, dated so the player knows how fresh it is. Not Riot data, not the player's own. */
export function MetaBanChips({ rows, updatedOn }: { rows: MetaBan[]; updatedOn: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Meta bans</Text>
      <View style={styles.row}>
        {rows.map((r) => (
          <View key={r.championId} style={styles.chip}>
            <ChampionPortrait championName={r.championName} size={44} />
            <Text style={styles.name} maxFontSizeMultiplier={1.15} numberOfLines={1}>{r.championName}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.muted} maxFontSizeMultiplier={1.15}>Community meta list · updated {updatedOn} · not based on your games</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: { alignItems: 'center', gap: 4, width: 60 },
  name: { color: colors.text, fontSize: font.caption - 1, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: font.caption },
})
