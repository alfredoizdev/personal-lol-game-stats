import { describe, expect, it } from 'vitest'
import type { MatchSummary } from '@lpp/shared'
import { mostPlayedLine } from '../src/lib/most-played'

const g = (championName: string, win = true) => ({ me: { championName, win }, remake: false, queueId: 420 }) as unknown as MatchSummary

describe('mostPlayedLine (owner, 2026-10-30: champions as one line under the Matches header, not a card)', () => {
  it('names the two most played champions with their game counts', () => {
    expect(mostPlayedLine([g('Vel\'Koz'), g('Kindred'), g('Vel\'Koz'), g('Galio'), g('Vel\'Koz'), g('Kindred')])).toBe("Most played · Vel'Koz 3 games · Kindred 2 games")
  })
  it('one champion, singular; nothing without games', () => {
    expect(mostPlayedLine([g('Zed')])).toBe('Most played · Zed 1 game')
    expect(mostPlayedLine([])).toBeNull()
  })
  it('skips remakes', () => {
    expect(mostPlayedLine([{ ...g('Zed'), remake: true } as MatchSummary, g('Ahri')])).toBe('Most played · Ahri 1 game')
  })
})
