import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { LiveAlert } from '@lpp/shared'
import type { QueuedAlert } from '@/lib/live-alerts-queue'
import { colors, font, radius, space } from '@/theme/tokens'

const TONE: Record<LiveAlert['tone'], string> = { good: colors.win, bad: colors.enemy, neutral: colors.accent }
const ICON: Record<LiveAlert['tone'], React.ComponentProps<typeof Ionicons>['name']> = { good: 'flash', bad: 'skull', neutral: 'notifications' }

function AlertCard({ alert, onDismiss }: { alert: LiveAlert; onDismiss: () => void }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start()
  }, [anim])
  const color = TONE[alert.tone]
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-32, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={`${alert.title}. Dismiss`} style={[styles.card, { borderColor: color }]}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Ionicons name={ICON[alert.tone]} size={22} color={colors.text} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} maxFontSizeMultiplier={1.15} numberOfLines={2}>{alert.title}</Text>
          {alert.body ? <Text style={styles.body} maxFontSizeMultiplier={1.15} numberOfLines={2}>{alert.body}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  )
}

/** In-app alert cards (goal flips, kills, deaths, objectives, match found): newest at the bottom, max 3, 7 s each, tap to dismiss. Big enough to be noticed mid-game. */
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 2,
    borderRadius: radius.card,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: font.body + 4, fontWeight: '800', lineHeight: 24 },
  body: { color: colors.text, opacity: 0.85, fontSize: font.body, lineHeight: 20 },
})
