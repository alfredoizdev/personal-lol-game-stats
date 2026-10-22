import { Pressable, StyleSheet, Text, View } from 'react-native'
import { riotErrorCode } from '@/lib/riot-api'
import { colors, font, radius, space } from '@/theme/tokens'

/** "42 of 100 games loaded" + the only button that triggers Riot calls for the history (spec 5.3). */
export function BackfillBar({ loaded, total, running, idsPending, error, onStart }: { loaded: number; total: number; running: boolean; idsPending: boolean; error: unknown | null; onStart: () => void }) {
  const done = total > 0 && loaded >= total
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.text} maxFontSizeMultiplier={1.15}>
          {total === 0 ? (idsPending ? 'Finding your recent games…' : error ? "Couldn't list your games" : 'No recent games found') : `${loaded} of ${total} games loaded`}
        </Text>
        {!done && total > 0 ? (
          <Pressable onPress={onStart} disabled={running} accessibilityRole="button" style={[styles.btn, running && styles.btnOff]}>
            <Text style={styles.btnText} maxFontSizeMultiplier={1.15}>{running ? 'Loading…' : loaded === 0 ? 'Load your last 100 games' : 'Load the rest'}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      {error ? (
        <Text style={styles.err} maxFontSizeMultiplier={1.15}>
          {riotErrorCode(error) === 'RATE_LIMITED' ? 'Riot is rate-limiting; try again in a minute.' : error instanceof Error && !(error as { code?: string }).code ? error.message : "Couldn't load some games — try again."}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  text: { color: colors.muted, fontSize: font.caption, flexShrink: 1 },
  btn: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  btnOff: { opacity: 0.6 },
  btnText: { color: colors.text, fontSize: font.caption, fontWeight: '700' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  err: { color: colors.warn, fontSize: font.caption },
})
