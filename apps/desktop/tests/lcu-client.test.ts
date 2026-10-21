import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import nock from 'nock'
import { lcuGetCurrentSummoner } from '@electron/league/lcu-client'

describe('lcuGetCurrentSummoner', () => {
  beforeEach(() => {
    nock.cleanAll()
  })

  afterAll(() => {
    nock.cleanAll()
  })

  it('GETs /lol-summoner/v1/current-summoner with basic auth and parses response', async () => {
    const port = 51234
    const password = 'pw-XYZ'

    const expectedAuth = 'Basic ' + Buffer.from(`riot:${password}`).toString('base64')

    nock(`https://127.0.0.1:${port}`)
      .matchHeader('authorization', expectedAuth)
      .get('/lol-summoner/v1/current-summoner')
      .reply(200, {
        displayName: 'Faker',
        gameName: 'Hide on bush',
        tagLine: 'KR1',
        summonerLevel: 999,
        profileIconId: 1234,
        puuid: 'abc-puuid',
        extraField: 'ignored',
      })

    const summoner = await lcuGetCurrentSummoner({ port, password, protocol: 'https' })
    expect(summoner).toEqual({
      displayName: 'Faker',
      gameName: 'Hide on bush',
      tagLine: 'KR1',
      summonerLevel: 999,
      profileIconId: 1234,
      puuid: 'abc-puuid',
    })
  })

  it('throws on 401', async () => {
    const port = 51234
    nock(`https://127.0.0.1:${port}`)
      .get('/lol-summoner/v1/current-summoner')
      .reply(401, { errorCode: 'UNAUTHORIZED' })

    await expect(
      lcuGetCurrentSummoner({ port, password: 'bad', protocol: 'https' })
    ).rejects.toThrow(/401|auth/i)
  })

  it('throws on non-JSON body', async () => {
    const port = 51234
    nock(`https://127.0.0.1:${port}`)
      .get('/lol-summoner/v1/current-summoner')
      .reply(200, 'not json')

    await expect(
      lcuGetCurrentSummoner({ port, password: 'pw', protocol: 'https' })
    ).rejects.toThrow()
  })

  it('throws when LCU returns non-object JSON (null)', async () => {
    const port = 51234
    nock(`https://127.0.0.1:${port}`)
      .get('/lol-summoner/v1/current-summoner')
      .reply(200, 'null')

    await expect(
      lcuGetCurrentSummoner({ port, password: 'pw', protocol: 'https' })
    ).rejects.toThrow(/Unexpected LCU response shape/)
  })
})
