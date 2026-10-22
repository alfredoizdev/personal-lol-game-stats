import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import nock from 'nock'
import { getLiveAllGameData } from '@electron/league/live-client'

const BASE = 'https://127.0.0.1:2999'

describe('getLiveAllGameData', () => {
  beforeEach(() => nock.cleanAll())
  afterAll(() => nock.cleanAll())

  it('returns the parsed payload on 200', async () => {
    nock(BASE).get('/liveclientdata/allgamedata').reply(200, { gameData: { gameTime: 12.5, gameMode: 'CLASSIC' }, allPlayers: [] })
    await expect(getLiveAllGameData()).resolves.toEqual({ gameData: { gameTime: 12.5, gameMode: 'CLASSIC' }, allPlayers: [] })
  })

  it('returns null when the game client is not running (connection error)', async () => {
    nock(BASE).get('/liveclientdata/allgamedata').replyWithError('ECONNREFUSED')
    await expect(getLiveAllGameData()).resolves.toBeNull()
  })

  it('returns null on a non-2xx or non-JSON response', async () => {
    nock(BASE).get('/liveclientdata/allgamedata').reply(404, 'nope')
    await expect(getLiveAllGameData()).resolves.toBeNull()
    nock(BASE).get('/liveclientdata/allgamedata').reply(200, 'not json')
    await expect(getLiveAllGameData()).resolves.toBeNull()
  })
})
