import { describe, it, expect, beforeEach } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createSessionStorage } from '@electron/auth/session-storage'

// Reversible fake "encryption" so the test can prove the file holds the
// encrypted form, not the plaintext.
const encrypt = (s: string) => Buffer.from(s.split('').reverse().join(''), 'utf8')
const decrypt = (b: Buffer) => b.toString('utf8').split('').reverse().join('')

let filePath: string

beforeEach(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lpp-session-'))
  filePath = path.join(dir, 'session.json')
})

describe('createSessionStorage', () => {
  it('round-trips a value through encrypt/decrypt', async () => {
    const storage = createSessionStorage({ encrypt, decrypt, filePath })
    await storage.setItem('k', 'hello')
    await expect(storage.getItem('k')).resolves.toBe('hello')
  })

  it('does not write the plaintext to disk', async () => {
    const storage = createSessionStorage({ encrypt, decrypt, filePath })
    await storage.setItem('k', 'secret-token')
    const raw = await fs.readFile(filePath, 'utf8')
    expect(raw).not.toContain('secret-token')
  })

  it('returns null for a missing key', async () => {
    const storage = createSessionStorage({ encrypt, decrypt, filePath })
    await expect(storage.getItem('nope')).resolves.toBeNull()
  })

  it('removeItem deletes the key', async () => {
    const storage = createSessionStorage({ encrypt, decrypt, filePath })
    await storage.setItem('k', 'v')
    await storage.removeItem('k')
    await expect(storage.getItem('k')).resolves.toBeNull()
  })

  it('a corrupt file yields null and does not throw', async () => {
    await fs.writeFile(filePath, '{not json', 'utf8')
    const storage = createSessionStorage({ encrypt, decrypt, filePath })
    await expect(storage.getItem('k')).resolves.toBeNull()
  })
})
