import { execFile } from 'node:child_process'

const TARGETS = ['LeagueClient', 'LeagueClientUx']

function pgrep(name: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    execFile('pgrep', ['-x', name], (err, stdout) => {
      if (!err) {
        resolve(stdout.trim().length > 0)
        return
      }
      const e = err as unknown as { code?: number | string }
      if (e.code === 'ENOENT') {
        reject(new Error('pgrep not found on this system'))
        return
      }
      // pgrep exits 1 when nothing matches — not an error for us
      if (e.code === 1) {
        resolve(false)
        return
      }
      reject(err)
    })
  })
}

export async function isLeagueRunning(): Promise<boolean> {
  for (const name of TARGETS) {
    if (await pgrep(name)) return true
  }
  return false
}
