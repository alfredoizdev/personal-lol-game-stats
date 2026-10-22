/**
 * Riot Live Client Data API — only available on the gaming machine while a
 * match is running: https://127.0.0.1:2999 (self-signed cert, no auth).
 * One endpoint is read: /liveclientdata/allgamedata. Any failure → null.
 */
import https from 'node:https'
import type { RawAllGameData } from '@lpp/shared'

const HOST = '127.0.0.1'
const PORT = 2999
const REQUEST_TIMEOUT_MS = 3000

const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true })

function liveGet<T>(path: string): Promise<T | null> {
  return new Promise((resolve) => {
    const req = https.request(
      { host: HOST, port: PORT, path, method: 'GET', agent, headers: { accept: 'application/json' }, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c as Buffer))
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            resolve(null)
            return
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T)
          } catch {
            resolve(null)
          }
        })
      },
    )
    req.on('error', () => resolve(null))
    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })
    req.end()
  })
}

export async function getLiveAllGameData(): Promise<RawAllGameData | null> {
  const raw = await liveGet<unknown>('/liveclientdata/allgamedata')
  if (!raw || typeof raw !== 'object') return null
  return raw as RawAllGameData
}
