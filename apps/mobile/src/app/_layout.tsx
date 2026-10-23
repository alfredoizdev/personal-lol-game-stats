import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/lib/auth-context'
import { PERSIST_KEY, PERSIST_MAX_AGE_MS, shouldPersistQuery } from '@/lib/query-persist'
import { colors } from '@/theme/tokens'

// Instant launch: the match cache is written to the device (throttled) and restored before the first query runs.
const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: PERSIST_MAX_AGE_MS } } })
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: PERSIST_KEY, throttleTime: 3000 })

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: PERSIST_MAX_AGE_MS, dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' && shouldPersistQuery(q.queryKey) } }}>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  )
}
