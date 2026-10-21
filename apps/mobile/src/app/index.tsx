import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/lib/auth-context'
import { resolveEntryRoute } from '@/lib/route-guard'
import { colors } from '@/theme/tokens'

export default function Index() {
  const { user, loading } = useAuth()
  // Task 6 replaces `linked: null` with the real linked-account query.
  const route = resolveEntryRoute({ loading, signedIn: !!user, linked: user ? true : null })
  if (!route) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    )
  }
  return <Redirect href={route} />
}
