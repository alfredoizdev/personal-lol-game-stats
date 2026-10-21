import { describe, it, expect } from 'vitest'
import { isRefreshTokenError } from '../src/auth-errors'

describe('isRefreshTokenError', () => {
  describe('matches fatal refresh-token errors (should signOut local)', () => {
    it('exact supabase-js message', () => {
      expect(
        isRefreshTokenError('Invalid Refresh Token: Refresh Token Not Found'),
      ).toBe(true)
    })

    it('short form "Invalid Refresh Token"', () => {
      expect(isRefreshTokenError('Invalid Refresh Token')).toBe(true)
    })

    it('short form "Refresh Token Not Found"', () => {
      expect(isRefreshTokenError('Refresh Token Not Found')).toBe(true)
    })

    it('case-insensitive match', () => {
      expect(isRefreshTokenError('invalid refresh token')).toBe(true)
      expect(isRefreshTokenError('REFRESH TOKEN NOT FOUND')).toBe(true)
    })

    it('message wrapped with extra context', () => {
      expect(
        isRefreshTokenError(
          'AuthApiError: Invalid Refresh Token: Refresh Token Not Found at handleError (errors.js:54:9)',
        ),
      ).toBe(true)
    })
  })

  describe('rejects transient / unrelated errors (must preserve session)', () => {
    it('network failure', () => {
      expect(isRefreshTokenError('Network request failed')).toBe(false)
    })

    it('rate limited', () => {
      expect(isRefreshTokenError('429 Too Many Requests')).toBe(false)
    })

    it('storage read failed', () => {
      expect(isRefreshTokenError('AsyncStorage error: SecureStore unavailable')).toBe(false)
    })

    it('signed-out token (different message)', () => {
      expect(isRefreshTokenError('User not found')).toBe(false)
    })

    it('generic auth error without refresh token mention', () => {
      expect(isRefreshTokenError('Auth session missing')).toBe(false)
    })
  })

  describe('rejects non-string / empty input', () => {
    it('null', () => {
      expect(isRefreshTokenError(null)).toBe(false)
    })

    it('undefined', () => {
      expect(isRefreshTokenError(undefined)).toBe(false)
    })

    it('empty string', () => {
      expect(isRefreshTokenError('')).toBe(false)
    })

    it('number', () => {
      expect(isRefreshTokenError(401)).toBe(false)
    })

    it('Error object (not unwrapped)', () => {
      // The caller is responsible for passing err.message — passing the
      // raw Error must NOT accidentally match via toString().
      expect(isRefreshTokenError(new Error('Invalid Refresh Token'))).toBe(false)
    })
  })
})
