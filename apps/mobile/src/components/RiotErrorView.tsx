import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { RiotErrorCode } from '@/lib/riot-api'
import { colors, font, radius, space } from '@/theme/tokens'

const COPY: Record<RiotErrorCode, { title: string; body: string }> = {
  KEY_INVALID: { title: 'Riot key expired', body: 'Renew the development key and run set-riot-key.sh, then pull to refresh.' },
  RATE_LIMITED: { title: 'Riot is busy', body: 'Too many requests right now. Pull down to retry in a minute.' },
  NOT_FOUND: { title: 'Account not found', body: 'Riot has no match history for this Riot ID in this region.' },
  UNKNOWN: { title: "Couldn't load matches", body: 'Check your connection and try again.' },
}

export function RiotErrorView({ code, onRetry }: { code: RiotErrorCode; onRetry?: () => void }) {
  const c = COPY[code]
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.body}>{c.body}</Text>
      {onRetry && code !== 'KEY_INVALID' ? (
        <Pressable style={styles.button} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  body: { color: colors.muted, fontSize: font.caption + 2 },
  button: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radius.control, paddingVertical: 10, paddingHorizontal: 18, marginTop: 4 },
  buttonText: { color: colors.text, fontWeight: '700' },
})
