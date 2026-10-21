import { app, safeStorage } from 'electron'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSessionStorage } from './session-storage'

export function createMainSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in apps/desktop/.env')
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption is not available; refusing to store the session')
  }
  const storage = createSessionStorage({
    encrypt: (s) => safeStorage.encryptString(s),
    decrypt: (b) => safeStorage.decryptString(b),
    filePath: path.join(app.getPath('userData'), 'session.json'),
  })
  return createClient(url, anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
}
