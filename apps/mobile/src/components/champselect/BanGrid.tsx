import { StyleSheet, Text, View } from 'react-native'
import type { ChampSelectBans } from '@lpp/shared'
import { ChampionPortrait } from '@/components/ChampionPortrait'
import { colors, font, radius, space } from '@/theme/tokens'

function Tile({ name, reason, ring, tone }: { name: string; reason: string; ring: 'loss' | 'none'; tone: 'loss' | 'muted' }) {
  return (
    <View style={styles.tile}>
      <ChampionPortrait championName={name} size={60} ring={ring} />
      <Text style={styles.name} maxFontSizeMultiplier={1.1} numberOfLines={1}>{name}</Text>
      <Text style={[styles.reason, tone === 'loss' ? styles.reasonLoss : null]} maxFontSizeMultiplier={1.1} numberOfLines={1}>{reason}</Text>
    </View>
  )
}

function Group({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Text style={styles.groupLabel} maxFontSizeMultiplier={1.15}>{label}</Text>
        <Text style={styles.groupHint} maxFontSizeMultiplier={1.15}>{hint}</Text>
      </View>
      <View style={styles.row}>{children}</View>
    </View>
  )
}

/**
 * Six bans to consider (owner, 2026-10-23): three from your own games (the lane
 * opponents you lose to most in this role) and three from the dated meta list.
 * Statements about your record, never orders. Red tiles (owner, 2026-10-28: "hazla roja para que se vea más").
 */
export function BanGrid({ bans, roleLabel, updatedOn }: { bans: ChampSelectBans; roleLabel: string; updatedOn: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Bans to consider</Text>
      <Group label="From your games" hint={`you lose to these as ${roleLabel}`}>
        {bans.history.length === 0 ? (
          <Text style={styles.empty} maxFontSizeMultiplier={1.15}>No lane opponent you lose to twice yet as {roleLabel}.</Text>
        ) : (
          bans.history.map((r) => <Tile key={r.championId} name={r.championName} reason={`Lost ${r.games - r.wins} of ${r.games}`} ring="loss" tone="loss" />)
        )}
      </Group>
      <Group label="Meta" hint={`community list · ${updatedOn}`}>
        {bans.meta.map((m) => <Tile key={m.championId} name={m.championName} reason="Strong this patch" ring="loss" tone="muted" />)}
      </Group>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(251, 92, 122, 0.08)', borderColor: 'rgba(251, 92, 122, 0.45)', borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.md },
  title: { color: colors.loss, fontSize: font.body + 3, fontWeight: '900' },
  group: { gap: space.sm },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' },
  groupLabel: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  groupHint: { color: colors.muted, fontSize: font.caption },
  row: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: 'rgba(251, 92, 122, 0.16)', borderWidth: 1, borderColor: 'rgba(251, 92, 122, 0.5)', borderRadius: radius.control, paddingVertical: space.sm, paddingHorizontal: 4 },
  name: { color: colors.text, fontSize: font.caption + 1, fontWeight: '800' },
  reason: { color: colors.muted, fontSize: font.caption - 1, fontWeight: '600' },
  reasonLoss: { color: colors.loss },
  empty: { color: colors.muted, fontSize: font.caption + 1, flex: 1 },
})
