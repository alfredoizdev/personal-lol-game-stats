import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/lib/auth-context'
import { useLinkedAccount } from '@/hooks/useLinkedAccount'
import { resolveEntryRoute } from '@/lib/route-guard'
import { colors } from '@/theme/tokens'

export default function Index() {
  const { user, loading } = useAuth()
  const { data } = useLinkedAccount()
  const route = resolveEntryRoute({
    loading,
    signedIn: !!user,
    linked: data === undefined ? null : data !== null,
  })
  if (!route) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    )
  }
  return <Redirect href={route} />
}
