import { describe, it, expect } from 'vitest'
import { planPostSignupSetup } from '../src/lib/post-signup'

describe('planPostSignupSetup', () => {
  it('does nothing without pending metadata', () => {
    expect(planPostSignupSetup({}, { hasLinkedAccount: false, displayName: null })).toEqual([])
  })
  it('sets the display name when the profile has none', () => {
    expect(planPostSignupSetup({ display_name: 'alfredo' }, { hasLinkedAccount: false, displayName: null })).toEqual([
      { type: 'set-display-name', displayName: 'alfredo' },
    ])
  })
  it('does not overwrite an existing display name', () => {
    expect(planPostSignupSetup({ display_name: 'alfredo' }, { hasLinkedAccount: false, displayName: 'other' })).toEqual([])
  })
  it('links the pending Riot ID when no account is linked yet', () => {
    expect(
      planPostSignupSetup(
        { pending_riot_game_name: 'Name', pending_riot_tag_line: 'NA1', pending_region: 'NA' },
        { hasLinkedAccount: false, displayName: 'x' },
      ),
    ).toEqual([{ type: 'link-riot-account', gameName: 'Name', tagLine: 'NA1', region: 'NA' }])
  })
  it('skips the pending link when an account is already linked, but still clears it', () => {
    expect(
      planPostSignupSetup(
        { pending_riot_game_name: 'Name', pending_riot_tag_line: 'NA1', pending_region: 'NA' },
        { hasLinkedAccount: true, displayName: 'x' },
      ),
    ).toEqual([{ type: 'clear-pending' }])
  })
  it('defaults an unknown pending region to NA', () => {
    const plan = planPostSignupSetup({ pending_riot_game_name: 'N', pending_riot_tag_line: 'T', pending_region: 'XX' }, { hasLinkedAccount: false, displayName: 'x' })
    expect(plan[0]).toMatchObject({ type: 'link-riot-account', region: 'NA' })
  })
})
