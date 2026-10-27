import { Redirect, Stack, useSegments } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { resolveAppGroupRedirect } from '@/lib/route-guard'
import { usePushRegistration } from '@/hooks/usePushRegistration'
import { LiveFeedProvider } from '@/lib/live-feed-context'
import { HistoryProvider, useHistory } from '@/lib/history-context'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useChampSelectScreen } from '@/hooks/useChampSelectScreen'
import { usePostGameScreen } from '@/hooks/usePostGameScreen'
import { colors } from '@/theme/tokens'

export default function AppLayout() {
  const { user, loading } = useAuth()
  const { data } = useLinkedAccount()
  const segments = useSegments() as string[]
  usePushRegistration()
  const redirect = resolveAppGroupRedirect({
    loading,
    signedIn: !!user,
    linked: data === undefined ? null : data !== null,
    segment: segments[1],
  })
  if (loading) return null
  if (redirect) return <Redirect href={redirect} />

  return (
    <LiveFeedProvider>
      <HistoryProvider account={data ?? null}>
        <AppStack />
      </HistoryProvider>
    </LiveFeedProvider>
  )
}

/** The tabs wait behind one loading screen until every game is loaded, once for every tab, so nothing moves on screen afterwards. */
function AppStack() {
  const history = useHistory()
  useChampSelectScreen()
  usePostGameScreen()
  if (history.state === 'loading') return <LoadingScreen loaded={history.loaded} total={history.total} idsPending={history.idsPending} />
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="link" />
      <Stack.Screen name="champ-select" options={{ presentation: 'modal' }} />
      {/* Full screen, no swipe-down: it closes by itself (review ready → match review; next queue → Live). Owner, 2026-10-27. */}
      <Stack.Screen name="post-game" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
    </Stack>
  )
}
