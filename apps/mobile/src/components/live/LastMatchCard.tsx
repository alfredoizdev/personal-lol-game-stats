import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { lastMatchLine, type LiveSnapshotV2 } from '@lpp/shared'
import { colors, font, radius, space } from '@/theme/tokens'

/** After a game: one compact line about it, a link to Matches, and a close that returns the tab to Prepare. */
export function LastMatchCard({ snapshot, goal, onDismiss }: { snapshot: LiveSnapshotV2; goal: { text: string; met: boolean | null } | null; onDismiss: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.15}>Last match</Text>
          <Text style={styles.line} maxFontSizeMultiplier={1.15}>{lastMatchLine(snapshot, goal)}</Text>
          <Text style={styles.muted} maxFontSizeMultiplier={1.15}>Your review appears in Matches in a minute.</Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      <Pressable style={styles.button} onPress={() => router.navigate('/(app)/(tabs)/matches')} accessibilityRole="button">
        <Text style={styles.buttonText}>Go to Matches</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  text: { flex: 1, gap: 2 },
  kicker: { color: colors.muted, fontSize: font.caption, textTransform: 'uppercase', letterSpacing: 0.6 },
  line: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: font.caption + 1 },
  close: { color: colors.muted, fontSize: 26, lineHeight: 26, fontWeight: '600' },
  button: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radius.control, paddingVertical: 10, paddingHorizontal: 18 },
  buttonText: { color: colors.text, fontWeight: '700' },
})
