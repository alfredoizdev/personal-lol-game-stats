/**
 * Remote push needs a development or production build on a physical device:
 * Expo Go ('storeClient') dropped remote notifications in SDK 53, and
 * simulators have no APNs/FCM token.
 */
export function isPushSupported(env: { executionEnvironment: string | undefined; isDevice: boolean }): boolean {
  return env.isDevice && (env.executionEnvironment === 'standalone' || env.executionEnvironment === 'bare')
}
