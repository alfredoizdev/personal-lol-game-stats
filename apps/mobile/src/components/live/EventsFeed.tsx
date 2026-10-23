import { StyleSheet, Text, View } from 'react-native'
import { eventLine, formatDuration, type LiveAlertTone, type LiveEvent } from '@lpp/shared'
import { colors, font, radius, space } from '@/theme/tokens'

const TONE: Record<LiveAlertTone, string> = { good: colors.win, bad: colors.enemy, neutral: colors.muted }
const MAX_ROWS = 10

/** The game's own feed (kills, deaths, objectives, structures), newest first, as the client shows it. */
export function EventsFeed({ events, myChampion }: { events: LiveEvent[]; myChampion: string }) {
  const rows = events
    .map((e) => ({ e, line: eventLine(e, myChampion) }))
    .filter((r): r is { e: LiveEvent; line: NonNullable<ReturnType<typeof eventLine>> } => r.line !== null)
    .reverse()
    .slice(0, MAX_ROWS)
  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>Game events</Text>
      {rows.length === 0 ? <Text style={styles.muted} maxFontSizeMultiplier={1.15}>Nothing yet. Kills, deaths and objectives appear here as they happen.</Text> : null}
      {rows.map(({ e, line }) => (
        <View key={e.id} style={styles.row}>
          <Text style={styles.time} maxFontSizeMultiplier={1.15}>{formatDuration(Math.floor(e.time))}</Text>
          <View style={[styles.dot, { backgroundColor: TONE[line.tone] }]} />
          <Text style={styles.text} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            {line.title}
            {line.body ? <Text style={styles.body}> · {line.body}</Text> : null}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: font.caption + 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  time: { color: colors.muted, fontSize: font.caption, width: 44, fontVariant: ['tabular-nums'] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: colors.text, fontSize: font.body - 1, fontWeight: '600', flex: 1 },
  body: { color: colors.muted, fontWeight: '400' },
})
