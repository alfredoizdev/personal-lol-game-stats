import type { SupabaseClient } from '@supabase/supabase-js'
import { isRefreshTokenError } from '@lpp/shared'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; email: string; userId: string }

export type AuthController = {
  getState: () => AuthState
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  start: () => Promise<void>
}

type SessionLike = { user: { id: string; email?: string | null } } | null | undefined

function stateFromSession(session: SessionLike): AuthState {
  if (!session?.user) return { status: 'signed-out' }
  return { status: 'signed-in', email: session.user.email ?? '', userId: session.user.id }
}

export function createAuthController(
  client: SupabaseClient,
  emit: (state: AuthState) => void,
): AuthController {
  let state: AuthState = { status: 'loading' }

  const set = (next: AuthState) => {
    state = next
    emit(next)
  }

  return {
    getState: () => state,

    async start() {
      client.auth.onAuthStateChange((_event, session) => {
        set(stateFromSession(session as SessionLike))
      })
      const { data, error } = await client.auth.getSession()
      if (error) {
        if (isRefreshTokenError(error.message)) {
          // The refresh token is gone server-side; wipe the local copy so we
          // never loop on refresh. Transient errors keep storage intact.
          await client.auth.signOut({ scope: 'local' }).catch(() => {})
        }
        set({ status: 'signed-out' })
        return
      }
      set(stateFromSession(data.session as SessionLike))
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      set(stateFromSession(data.session as SessionLike))
      return { error: null }
    },

    async signOut() {
      await client.auth.signOut()
      set({ status: 'signed-out' })
    },
  }
}
