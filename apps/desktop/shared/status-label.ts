import type { LeagueStatus } from '@lpp/shared'

/** Human label for the collector's League status. Used by the tray tooltip and the renderer. */
export function statusLabel(status: LeagueStatus): string {
  switch (status.state) {
    case 'CLOSED':
      return 'League is not running'
    case 'STARTING':
      return 'League is starting…'
    case 'CONNECTED':
      return `Connected as ${status.summoner.gameName}#${status.summoner.tagLine}`
    case 'ERROR':
      return `Error: ${status.reason}`
  }
}
