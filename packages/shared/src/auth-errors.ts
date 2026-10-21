// Pure predicate the auth provider uses to decide whether a Supabase
// auth error is fatal (refresh token gone, must wipe local session) or
// transient (network blip, server hiccup, keep what's in storage).
//
// Lives in its own file because it's the heart of the
// "swallow stale refresh token" regression — the prior implementation
// matched too broadly and silently signed users out on every flaky
// getSession() call. The tests for this file are the regression net.

/**
 * Returns true ONLY when the message indicates the refresh token itself
 * is the problem. Anything else (network, throttling, server timeouts)
 * returns false so the caller leaves the session intact.
 */
export function isRefreshTokenError(message: unknown): boolean {
  if (typeof message !== 'string' || message.length === 0) return false
  const m = message.toLowerCase()
  return (
    m.includes('refresh token not found') ||
    m.includes('invalid refresh token')
  )
}
