import type { LiveViewState } from '@lpp/shared'

/**
 * The game events feed is a companion to the game in progress; once the match has
 * ended it carries no stat value, so the ended tail shows only the numbers.
 */
export function showEventsFeed(state: LiveViewState): boolean {
  return state !== 'ended'
}
