import { describe, it, expect, vi } from 'vitest'
import { EXPO_PUSH_URL, sendExpoPush, type ExpoPushMessage } from '@electron/notify/expo-push'

const msg = (to: string): ExpoPushMessage => ({ to, title: 'LanePulse', body: 'x', data: { app: 'lanepulse' } })

function fakeFetch(status: number, json: unknown) {
  return vi.fn(async () => ({ ok: status < 300, status, json: async () => json })) as unknown as typeof fetch
}

describe('sendExpoPush', () => {
  it('POSTs the messages as a JSON array to the Expo push endpoint', async () => {
    const f = fakeFetch(200, { data: [{ status: 'ok' }] })
    await sendExpoPush(f, [msg('ExponentPushToken[a]')])
    expect(f).toHaveBeenCalledTimes(1)
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!
    expect(url).toBe(EXPO_PUSH_URL)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json')
    expect(JSON.parse(String(init.body))).toEqual([msg('ExponentPushToken[a]')])
  })

  it('maps each ticket to its token and flags DeviceNotRegistered', async () => {
    const f = fakeFetch(200, {
      data: [
        { status: 'ok', id: '1' },
        { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
        { status: 'error', message: 'rate limited', details: { error: 'MessageRateExceeded' } },
      ],
    })
    const r = await sendExpoPush(f, [msg('a'), msg('b'), msg('c')])
    expect(r).toEqual([
      { token: 'a', ok: true, deviceNotRegistered: false },
      { token: 'b', ok: false, deviceNotRegistered: true },
      { token: 'c', ok: false, deviceNotRegistered: false },
    ])
  })

  it('throws on a non-2xx answer so the caller can retry later', async () => {
    await expect(sendExpoPush(fakeFetch(503, {}), [msg('a')])).rejects.toThrow(/503/)
  })

  it('sends nothing for an empty list', async () => {
    const f = fakeFetch(200, { data: [] })
    expect(await sendExpoPush(f, [])).toEqual([])
    expect(f).not.toHaveBeenCalled()
  })
})
