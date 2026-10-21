import { describe, it, expect } from 'vitest'
import { validateSignUp, type SignUpInput } from '../src/lib/sign-up-form'

const valid: SignUpInput = {
  username: 'alfredo',
  riotId: 'Hide on bush#KR1',
  email: 'a@b.co',
  password: 'longenough',
  confirm: 'longenough',
  region: 'NA',
  acceptedTerms: true,
}

describe('validateSignUp', () => {
  it('accepts a valid form and returns the parsed Riot ID', () => {
    expect(validateSignUp(valid)).toEqual({
      ok: true,
      value: {
        username: 'alfredo',
        email: 'a@b.co',
        password: 'longenough',
        region: 'NA',
        riotId: { gameName: 'Hide on bush', tagLine: 'KR1' },
      },
    })
  })
  it('allows an empty Riot ID (link later)', () => {
    const r = validateSignUp({ ...valid, riotId: '' })
    expect(r.ok && r.value.riotId).toBeNull()
  })
  it('rejects a malformed Riot ID', () => {
    expect(validateSignUp({ ...valid, riotId: 'NoTag' })).toEqual({ ok: false, field: 'riotId', message: 'Enter your Riot ID as Name#TAG' })
  })
  it('requires a username of at least 3 characters', () => {
    expect(validateSignUp({ ...valid, username: 'ab' })).toEqual({ ok: false, field: 'username', message: 'Username needs at least 3 characters' })
  })
  it('requires a plausible email', () => {
    expect(validateSignUp({ ...valid, email: 'nope' })).toEqual({ ok: false, field: 'email', message: 'Enter a valid email' })
  })
  it('requires 8+ character password', () => {
    expect(validateSignUp({ ...valid, password: 'short', confirm: 'short' })).toEqual({ ok: false, field: 'password', message: 'Password needs at least 8 characters' })
  })
  it('requires matching confirmation', () => {
    expect(validateSignUp({ ...valid, confirm: 'different1' })).toEqual({ ok: false, field: 'confirm', message: 'Passwords do not match' })
  })
  it('requires accepting the terms', () => {
    expect(validateSignUp({ ...valid, acceptedTerms: false })).toEqual({ ok: false, field: 'terms', message: 'Please accept the Terms and Privacy Policy' })
  })
  it('trims username and email', () => {
    const r = validateSignUp({ ...valid, username: '  alfredo ', email: ' A@b.co ' })
    expect(r.ok && r.value.username).toBe('alfredo')
    expect(r.ok && r.value.email).toBe('a@b.co')
  })
})
