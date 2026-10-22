import type { LeagueStatus } from '@lpp/shared'
import { formatDuration } from '@lpp/shared'
import type { LiveState } from '../electron/league/live-poller'

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

export function liveLabel(state: LiveState): string {
  switch (state.kind) {
    case 'idle':
      return 'Not in a game'
    case 'waiting':
      return `Waiting for a match (${state.phase})`
    case 'live':
      return `In game as ${state.snapshot.me.championName} · ${state.snapshot.gameTimeSeconds === null ? '--:--' : formatDuration(state.snapshot.gameTimeSeconds)}`
    case 'ended':
      return 'Match ended'
  }
}
