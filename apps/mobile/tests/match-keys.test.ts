import { describe, it, expect } from 'vitest'
import { matchKeys } from '../src/lib/match-keys'

describe('matchKeys', () => {
  it('scopes ids per account and keys details and timelines per match', () => {
    expect(matchKeys.ids('p1', 20)).toEqual(['match-ids', 'p1', 20])
    expect(matchKeys.detail('NA1_1')).toEqual(['match-detail', 'NA1_1'])
    expect(matchKeys.timeline('NA1_1')).toEqual(['match-timeline', 'NA1_1'])
  })
})
