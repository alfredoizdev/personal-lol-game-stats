import { Pressable, StyleSheet, Text, View } from 'react-native'
import { riotErrorCode } from '@/lib/riot-api'
import { backfillLine } from '@/lib/prematch-ui'
import { colors, font, radius, space } from '@/theme/tokens'

/** Progress of the automatic history load ("Loading your last 100 games… 42 of 100"); a Retry only when a run stopped short. */
export function BackfillBar({ loaded, total, running, idsPending, error, onRetry }: { loaded: number; total: number; running: boolean; idsPending: boolean; error: unknown | null; onRetry: () => void }) {
  const line = backfillLine({ idsPending, total, loaded, running, error })
  if (!line) return null
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.text} maxFontSizeMultiplier={1.15}>{line.text}</Text>
        {line.retry ? (
          <Pressable onPress={onRetry} accessibilityRole="button" style={styles.btn}>
            <Text style={styles.btnText} maxFontSizeMultiplier={1.15}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
      {total > 0 ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      ) : null}
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
  btnText: { color: colors.text, fontSize: font.caption, fontWeight: '700' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  err: { color: colors.warn, fontSize: font.caption },
})
