import { describe, it, expect } from 'vitest'
import { champSelectPick } from '@electron/league/champ-select'

const session = (over: Record<string, unknown> = {}) => ({
  localPlayerCellId: 2,
  myTeam: [
    { cellId: 0, championId: 51, assignedPosition: 'bottom' },
    { cellId: 2, championId: 238, assignedPosition: 'middle' },
  ],
  ...over,
})

describe('champSelectPick (my own cell of /lol-champ-select/v1/session)', () => {
  it('maps my locked champion and assigned position to the app roles', () => {
    expect(champSelectPick(session())).toEqual({ championId: 238, position: 'MIDDLE' })
    expect(champSelectPick(session({ myTeam: [{ cellId: 2, championId: 0, assignedPosition: 'utility' }] }))).toEqual({ championId: null, position: 'UTILITY' })
    expect(champSelectPick(session({ myTeam: [{ cellId: 2, championId: 157, assignedPosition: '' }] }))).toEqual({ championId: 157, position: null })
  })
  it('is null when my cell is missing or the payload is not a session', () => {
    expect(champSelectPick(session({ localPlayerCellId: 9 }))).toBeNull()
    expect(champSelectPick(null)).toBeNull()
    expect(champSelectPick({ errorCode: 'RPC_ERROR' })).toBeNull()
  })
})
