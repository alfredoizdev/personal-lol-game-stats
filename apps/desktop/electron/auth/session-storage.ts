import { promises as fs } from 'node:fs'
import path from 'node:path'

export type SessionStorageDeps = {
  encrypt: (plaintext: string) => Buffer
  decrypt: (ciphertext: Buffer) => string
  filePath: string
}

export type SessionStorage = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

type FileShape = Record<string, string> // key -> base64(ciphertext)

/**
 * supabase-js `auth.storage` adapter for the main process. Every value is
 * encrypted with the injected `encrypt` (Electron safeStorage in prod) and
 * stored as base64 in one JSON file. Corrupt or missing files read as empty.
 */
export function createSessionStorage(deps: SessionStorageDeps): SessionStorage {
  async function read(): Promise<FileShape> {
    try {
      const raw = await fs.readFile(deps.filePath, 'utf8')
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
      return parsed as FileShape
    } catch {
      return {}
    }
  }

  async function write(data: FileShape): Promise<void> {
    await fs.mkdir(path.dirname(deps.filePath), { recursive: true })
    await fs.writeFile(deps.filePath, JSON.stringify(data), { encoding: 'utf8', mode: 0o600 })
  }

  return {
    async getItem(key) {
      const data = await read()
      const b64 = data[key]
      if (!b64) return null
      try {
        return deps.decrypt(Buffer.from(b64, 'base64'))
      } catch {
        return null
      }
    },
    async setItem(key, value) {
      const data = await read()
      data[key] = deps.encrypt(value).toString('base64')
      await write(data)
    },
    async removeItem(key) {
      const data = await read()
      delete data[key]
      await write(data)
    },
  }
}
