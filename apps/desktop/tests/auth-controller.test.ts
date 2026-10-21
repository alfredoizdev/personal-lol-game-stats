import { describe, it, expect, vi } from 'vitest'
import { createAuthController, type AuthState } from '@electron/auth/auth-controller'

type Listener = (event: string, session: unknown) => void

function fakeClient(opts: {
  session?: { user: { id: string; email: string } } | null
  getSessionError?: string
  signInError?: string
}) {
  let listener: Listener | null = null
  const client = {
    auth: {
      getSession: vi.fn(async () => {
        if (opts.getSessionError) return { data: { session: null }, error: { message: opts.getSessionError } }
        return { data: { session: opts.session ?? null }, error: null }
      }),
      signInWithPassword: vi.fn(async ({ email }: { email: string; password: string }) => {
        if (opts.signInError) return { data: { session: null }, error: { message: opts.signInError } }
        const session = { user: { id: 'u1', email } }
        listener?.('SIGNED_IN', session)
        return { data: { session }, error: null }
      }),
      signOut: vi.fn(async () => {
        listener?.('SIGNED_OUT', null)
        return { error: null }
      }),
      onAuthStateChange: vi.fn((cb: Listener) => {
        listener = cb
        return { data: { subscription: { unsubscribe: () => {} } } }
      }),
    },
  }
  return client
}

describe('createAuthController', () => {
  it('start() with a stored session emits signed-in', async () => {
    const client = fakeClient({ session: { user: { id: 'u1', email: 'a@b.c' } } })
    const states: AuthState[] = []
    const ctl = createAuthController(client as never, (s) => states.push(s))
    await ctl.start()
    expect(ctl.getState()).toEqual({ status: 'signed-in', email: 'a@b.c', userId: 'u1' })
    expect(states.at(-1)).toEqual({ status: 'signed-in', email: 'a@b.c', userId: 'u1' })
  })

  it('start() with a revoked refresh token clears the local session and emits signed-out', async () => {
    const client = fakeClient({ getSessionError: 'Invalid Refresh Token: Refresh Token Not Found' })
    const states: AuthState[] = []
    const ctl = createAuthController(client as never, (s) => states.push(s))
    await ctl.start()
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(ctl.getState()).toEqual({ status: 'signed-out' })
  })

  it('start() with a transient getSession error keeps signed-out without clearing', async () => {
    const client = fakeClient({ getSessionError: 'Network request failed' })
    const ctl = createAuthController(client as never, () => {})
    await ctl.start()
    expect(client.auth.signOut).not.toHaveBeenCalled()
    expect(ctl.getState()).toEqual({ status: 'signed-out' })
  })

  it('signIn with wrong password returns the error and stays signed-out', async () => {
    const client = fakeClient({ signInError: 'Invalid login credentials' })
    const ctl = createAuthController(client as never, () => {})
    await ctl.start()
    await expect(ctl.signIn('a@b.c', 'bad')).resolves.toEqual({ error: 'Invalid login credentials' })
    expect(ctl.getState()).toEqual({ status: 'signed-out' })
  })

  it('signIn success emits signed-in with the email', async () => {
    const client = fakeClient({})
    const states: AuthState[] = []
    const ctl = createAuthController(client as never, (s) => states.push(s))
    await ctl.start()
    await expect(ctl.signIn('a@b.c', 'ok')).resolves.toEqual({ error: null })
    expect(ctl.getState()).toEqual({ status: 'signed-in', email: 'a@b.c', userId: 'u1' })
  })

  it('signOut emits signed-out', async () => {
    const client = fakeClient({ session: { user: { id: 'u1', email: 'a@b.c' } } })
    const ctl = createAuthController(client as never, () => {})
    await ctl.start()
    await ctl.signOut()
    expect(ctl.getState()).toEqual({ status: 'signed-out' })
  })
})
