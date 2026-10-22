import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Screen } from '@/components/Screen'
import { LiveHero } from '@/components/LiveHero'
import { LiveMatchupTable } from '@/components/LiveMatchupTable'
import { LiveStatTiles } from '@/components/LiveStatTiles'
import { LiveTrendChart } from '@/components/LiveTrendChart'
import { PrepareCard } from '@/components/prematch/PrepareCard'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { useLiveSnapshot } from '@/hooks/useLiveSnapshot'
import { appendTrendPoint, type TrendPoint } from '@/lib/live-trend'
import { colors, font, radius, space } from '@/theme/tokens'

export default function LiveScreen() {
  const { snapshot, state, connected } = useLiveSnapshot()
  const { data: account } = useLinkedAccount()
  const [trend, setTrend] = useState<TrendPoint[]>([])

  useEffect(() => {
    if (snapshot) setTrend((h) => appendTrendPoint(h, snapshot))
  }, [snapshot])

  return (
    <Screen title="Live Match" subtitle="In-game performance">
      {state === 'waiting' || !snapshot ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Waiting for a match</Text>
            <Text style={styles.muted}>Keep the LanePulse collector open on your Mac. Your stats appear here as soon as a game starts.</Text>
            {!connected ? <Text style={styles.warn}>Not connected to live updates yet…</Text> : null}
          </View>
          {account ? <PrepareCard account={account} /> : null}
        </>
      ) : (
        <>
          <LiveHero
            snapshot={snapshot}
            badge={state === 'ended' ? 'ENDED' : state === 'stale' ? 'RECONNECTING' : snapshot.gameMode === 'DEMO' ? 'DEMO' : 'LIVE'}
          />
          {state === 'stale' ? <Text style={styles.warn}>No update from the desktop for a while. Reconnecting…</Text> : null}
          <LiveMatchupTable me={snapshot.me} opponent={snapshot.opponent} />
          <LiveStatTiles me={snapshot.me} teamKills={snapshot.teamKills} />
          <LiveTrendChart points={trend} />
          {state === 'ended' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Match ended</Text>
              <Text style={styles.muted}>Your review will appear in Matches in a minute.</Text>
              <Pressable style={styles.button} onPress={() => router.navigate('/(app)/(tabs)/matches')} accessibilityRole="button">
                <Text style={styles.buttonText}>Go to Matches</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm },
  cardTitle: { color: colors.text, fontSize: font.body + 2, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: font.body },
  warn: { color: colors.warn, fontSize: font.caption + 1 },
  button: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radius.control, paddingVertical: 10, paddingHorizontal: 18, marginTop: 4 },
  buttonText: { color: colors.text, fontWeight: '700' },
})
