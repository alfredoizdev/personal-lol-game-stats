import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))

import { execFile } from 'node:child_process'
import { isLeagueRunning } from '@electron/league/process'

const execFileMock = execFile as unknown as ReturnType<typeof vi.fn>

describe('isLeagueRunning', () => {
  beforeEach(() => {
    execFileMock.mockReset()
  })

  it('returns true when pgrep finds LeagueClient', async () => {
    execFileMock.mockImplementation((_cmd, _args, cb) => {
      cb(null, '12345\n', '')
    })
    await expect(isLeagueRunning()).resolves.toBe(true)
  })

  it('returns true when pgrep finds LeagueClientUx', async () => {
    execFileMock.mockImplementation((_cmd, args, cb) => {
      if (Array.isArray(args) && args.includes('LeagueClientUx')) {
        cb(null, '67890\n', '')
      } else {
        const err = new Error('not found') as Error & { code?: number }
        err.code = 1
        cb(err, '', '')
      }
    })
    await expect(isLeagueRunning()).resolves.toBe(true)
  })

  it('returns false when neither process is found (pgrep exits 1)', async () => {
    execFileMock.mockImplementation((_cmd, _args, cb) => {
      const err = new Error('not found') as Error & { code?: number }
      err.code = 1
      cb(err, '', '')
    })
    await expect(isLeagueRunning()).resolves.toBe(false)
  })

  it('throws if pgrep itself is missing (ENOENT)', async () => {
    execFileMock.mockImplementation((_cmd, _args, cb) => {
      const err = new Error('command not found') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      cb(err, '', '')
    })
    await expect(isLeagueRunning()).rejects.toThrow(/pgrep/)
  })
})
