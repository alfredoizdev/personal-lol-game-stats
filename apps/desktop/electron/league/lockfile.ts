import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type LockfileData = {
  port: number
  password: string
  protocol: 'https'
}

const LOCKFILE_PATHS = [
  '/Applications/League of Legends.app/Contents/LoL/lockfile',
  path.join(os.homedir(), 'Library/Application Support/League of Legends/lockfile'),
]

export function parseLockfile(raw: string): LockfileData | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const parts = trimmed.split(':')
  if (parts.length < 5) return null

  const port = Number(parts[2])
  const password = parts.slice(3, -1).join(':')
  const protocol = parts[parts.length - 1]

  if (!Number.isFinite(port) || port <= 0) return null
  if (!password) return null
  if (protocol !== 'https') return null

  return { port, password, protocol }
}

export async function readLockfile(): Promise<LockfileData | null> {
  for (const candidate of LOCKFILE_PATHS) {
    try {
      const raw = await fs.readFile(candidate, 'utf8')
      const parsed = parseLockfile(raw)
      if (parsed) return parsed
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw err
    }
  }
  return null
}
