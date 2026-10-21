import { useMemo } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { summarizeMatch } from '@lpp/shared'
import { Disclaimer } from '@/components/Disclaimer'
import { LaneMatchupCard } from '@/components/LaneMatchupCard'
import { MatchHero } from '@/components/MatchHero'
import { RiotErrorView } from '@/components/RiotErrorView'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { matchDetailQuery } from '@/hooks/useRecentMatches'
import { riotErrorCode } from '@/lib/riot-api'
import { colors, font, radius, space } from '@/theme/tokens'

export default function MatchReviewScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>()
  const { data: account } = useLinkedAccount()
  const detail = useQuery({ ...matchDetailQuery(String(matchId), account?.region ?? 'NA'), enabled: !!matchId && !!account })
  const now = Date.now()
  const summary = useMemo(
    () => (detail.data && account ? summarizeMatch(detail.data, account.puuid) : null),
    [detail.data, account],
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/matches'))} hitSlop={10} accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>Match Review</Text>
            <Text style={styles.subtitle}>{summary ? `${summary.gameMode === 'CLASSIC' ? "Summoner's Rift" : summary.gameMode}  •  ${summary.queueLabel}` : ' '}</Text>
          </View>
        </View>

        {detail.isPending ? <ActivityIndicator color={colors.muted} style={styles.spinner} /> : null}
        {detail.isError ? <RiotErrorView code={riotErrorCode(detail.error)} onRetry={() => void detail.refetch()} /> : null}
        {detail.isSuccess && !summary ? <Text style={styles.muted}>This account did not play in this match.</Text> : null}

        {summary ? (
          <>
            <MatchHero summary={summary} now={now} />
            <LaneMatchupCard me={summary.me} opponent={summary.opponent} />
            <View style={styles.soon}>
              <Text style={styles.soonTitle}>Analysis coming soon</Text>
              <Text style={styles.muted}>What you did well, what needs work and your next focus arrive in the next update.</Text>
            </View>
          </>
        ) : null}

        <View style={styles.footer}>
          <Disclaimer />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.md, paddingTop: space.md, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { width: 40, height: 40, borderRadius: radius.control, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 28, lineHeight: 30, marginTop: -4 },
  title: { color: colors.text, fontSize: font.title - 4, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: font.caption + 1 },
  spinner: { marginTop: space.lg },
  muted: { color: colors.muted, fontSize: font.body },
  soon: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: 4 },
  soonTitle: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  footer: { paddingVertical: space.lg },
})
