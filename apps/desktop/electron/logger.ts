import { promises as fs, existsSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const LOG_DIR = path.join(os.homedir(), 'Library/Logs/LanePulse')
const LOG_FILE = path.join(LOG_DIR, 'app.log')
const MAX_BYTES = 1_000_000

let initialized = false
function ensureDir(): void {
  if (initialized) return
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
  initialized = true
}

function redact(msg: string): string {
  return msg
    // password=value
    .replace(/(password=)[^\s,]+/gi, '$1<redacted>')
    // Basic <token>
    .replace(/(Basic\s+)[A-Za-z0-9+/=]+/g, '$1<redacted>')
    // puuid=<value> (Riot encrypted puuids are 78-char base64-ish; LCU
    // UUIDs are 36-char dashed. Match both shapes liberally to cover
    // logger.info(`Profile fetched for ${summoner.puuid}`) too.)
    .replace(/(puuid[=:\s]+)[A-Za-z0-9_-]{32,}/gi, '$1<redacted>')
    // Bearer <token>
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/g, '$1<redacted>')
}

// Throttle rotation check to once per 1000 writes — previously fs.stat
// hit the filesystem on EVERY log line (hundreds per minute during
// active polling). Rotation only matters when the file grows past
// MAX_BYTES, which takes many thousands of lines anyway.
let writesSinceRotationCheck = 0
const ROTATION_CHECK_EVERY = 1000
async function rotateIfNeeded(): Promise<void> {
  writesSinceRotationCheck += 1
  if (writesSinceRotationCheck < ROTATION_CHECK_EVERY) return
  writesSinceRotationCheck = 0
  try {
    const stat = await fs.stat(LOG_FILE)
    if (stat.size > MAX_BYTES) {
      await fs.rename(LOG_FILE, LOG_FILE + '.1')
    }
  } catch {
    // file doesn't exist yet — fine
  }
}

async function write(level: 'INFO' | 'WARN' | 'ERROR', msg: string): Promise<void> {
  ensureDir()
  await rotateIfNeeded()
  const safe = redact(msg)
  const line = `${new Date().toISOString()} ${level} ${safe}\n`
  console.log(line.trim())
  try {
    await fs.appendFile(LOG_FILE, line)
  } catch {
    // swallow — logging failures must not crash the app
  }
}

export const logger = {
  info: (m: string) => void write('INFO', m),
  warn: (m: string) => void write('WARN', m),
  error: (m: string) => void write('ERROR', m),
}
