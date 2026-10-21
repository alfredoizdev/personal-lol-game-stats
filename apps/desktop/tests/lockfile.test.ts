import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(),
    },
  }
})

import { promises as fs } from 'node:fs'
import { parseLockfile, readLockfile } from '@electron/league/lockfile'

const readFileMock = fs.readFile as unknown as ReturnType<typeof vi.fn>

describe('parseLockfile', () => {
  it('parses a well-formed LCU lockfile string', () => {
    const raw = 'LeagueClient:12345:51234:abc-XYZ_password:https'
    expect(parseLockfile(raw)).toEqual({
      port: 51234,
      password: 'abc-XYZ_password',
      protocol: 'https',
    })
  })

  it('returns null for non-https protocol', () => {
    const raw = 'LeagueClient:12345:51234:secret:http'
    expect(parseLockfile(raw)).toBeNull()
  })

  it('returns null when the port is not a number', () => {
    const raw = 'LeagueClient:12345:NOPE:secret:https'
    expect(parseLockfile(raw)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseLockfile('')).toBeNull()
  })

  it('returns null when there are fewer than 5 fields', () => {
    expect(parseLockfile('LeagueClient:1:2:3')).toBeNull()
  })

  it('trims trailing whitespace/newline', () => {
    const raw = 'LeagueClient:12345:51234:secret:https\n'
    expect(parseLockfile(raw)).toEqual({
      port: 51234,
      password: 'secret',
      protocol: 'https',
    })
  })

  it('handles password containing colons', () => {
    const raw = 'LeagueClient:12345:51234:abc:def:https'
    expect(parseLockfile(raw)).toEqual({
      port: 51234,
      password: 'abc:def',
      protocol: 'https',
    })
  })
})

describe('readLockfile', () => {
  beforeEach(() => {
    readFileMock.mockReset()
  })

  it('falls back to second path when first returns ENOENT', async () => {
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' }) as NodeJS.ErrnoException
    readFileMock
      .mockRejectedValueOnce(enoent)
      .mockResolvedValueOnce('LeagueClient:1:51234:secret:https\n')

    await expect(readLockfile()).resolves.toEqual({
      port: 51234,
      password: 'secret',
      protocol: 'https',
    })
  })

  it('rethrows non-ENOENT errors from readFile', async () => {
    const eacces = Object.assign(new Error('EACCES'), { code: 'EACCES' }) as NodeJS.ErrnoException
    readFileMock.mockRejectedValueOnce(eacces)
    await expect(readLockfile()).rejects.toThrow('EACCES')
  })
})
