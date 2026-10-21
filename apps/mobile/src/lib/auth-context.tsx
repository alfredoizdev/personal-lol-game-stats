import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isRefreshTokenError } from '@lpp/shared'
import { supabase } from './supabase'
import { getRememberMe } from './remember-me'

type AuthState = {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const clearStaleSession = async (reason: unknown) => {
      console.warn('[auth] clearing stale local session:', reason)
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        /* signOut on a phantom session can throw — ignore. */
      }
      if (!cancelled) setSession(null)
    }

    // "Remember me" unticked at the last sign-in: drop the stored session on
    // this cold start before restoring anything.
    getRememberMe()
      .then(async (remember) => {
        if (!remember) await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        return supabase.auth.getSession()
      })
      .then(async ({ data, error }) => {
        if (cancelled) return
        if (error) {
          if (isRefreshTokenError(error.message)) {
            await clearStaleSession(error.message)
          } else {
            // Transient — keep whatever is in storage; onAuthStateChange catches up.
            console.warn('[auth] getSession returned non-fatal error:', error.message)
            setSession(data.session)
          }
          return
        }
        setSession(data.session)
      })
      .catch((err: unknown) => {
        console.warn('[auth] getSession rejected:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) setSession(next)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
