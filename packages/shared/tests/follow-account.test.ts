import { describe, it, expect } from 'vitest'
import { accountToFollow } from '../src/follow-account'

const accounts = [
  { puuid: 'solo', gameName: 'SoloSoult', tagLine: 'NA1' },
  { puuid: 'hex', gameName: 'Hexed', tagLine: '7551' },
]

describe('accountToFollow (the phone follows the account League is signed in with)', () => {
  it('switches to the linked account the client is using when it is not the active one', () => {
    expect(accountToFollow({ gameName: 'Hexed', tagLine: '7551' }, accounts, 'solo')).toEqual({ kind: 'switch', puuid: 'hex' })
  })
  it('matches the Riot ID ignoring case and spaces', () => {
    expect(accountToFollow({ gameName: 'hexed ', tagLine: '7551' }, accounts, 'solo')).toEqual({ kind: 'switch', puuid: 'hex' })
  })
  it('does nothing when the client account is already active', () => {
    expect(accountToFollow({ gameName: 'SoloSoult', tagLine: 'NA1' }, accounts, 'solo')).toBeNull()
  })
  it('reports an unlinked client account so the phone can say so', () => {
    expect(accountToFollow({ gameName: 'Other', tagLine: 'EUW' }, accounts, 'solo')).toEqual({ kind: 'unlinked', riotId: 'Other#EUW' })
  })
  it('nothing without a client identity or without linked accounts', () => {
    expect(accountToFollow(null, accounts, 'solo')).toBeNull()
    expect(accountToFollow({ gameName: 'Hexed', tagLine: '7551' }, [], null)).toBeNull()
  })
})
