import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import type { LiveAlert } from '@lpp/shared'
import type { QueuedAlert } from '@/lib/live-alerts-queue'
import { colors, font, radius, space } from '@/theme/tokens'

const TONE: Record<LiveAlert['tone'], string> = { good: colors.win, bad: colors.enemy, neutral: colors.accent }

function AlertCard({ alert, onDismiss }: { alert: LiveAlert; onDismiss: () => void }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start()
  }, [anim])
  const color = TONE[alert.tone]
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }}>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={`${alert.title}. Dismiss`} style={[styles.card, { borderLeftColor: color }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.text}>
          <Text style={styles.title} maxFontSizeMultiplier={1.15} numberOfLines={1}>{alert.title}</Text>
          {alert.body ? <Text style={styles.body} maxFontSizeMultiplier={1.15} numberOfLines={1}>{alert.body}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  )
}

/** In-app alert cards (goal flips, kills, deaths, objectives, match found): newest at the bottom, max 3, 5 s each, tap to dismiss. */
export function AlertStack({ alerts, onDismiss }: { alerts: QueuedAlert[]; onDismiss: (id: string) => void }) {
  if (alerts.length === 0) return null
  return (
    <View style={styles.stack} accessibilityLiveRegion="polite">
      {alerts.map((q) => (
        <AlertCard key={q.alert.id} alert={q.alert} onDismiss={() => onDismiss(q.alert.id)} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surfaceSolid, borderColor: colors.border, borderWidth: 1, borderLeftWidth: 4, borderRadius: radius.control, paddingVertical: 10, paddingHorizontal: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1 },
  title: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  body: { color: colors.muted, fontSize: font.caption },
})
