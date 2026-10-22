/** Expo Push API client (no access token: the project does not enable enhanced push security). */
export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  channelId?: string
  priority?: 'default' | 'normal' | 'high'
}

export type ExpoPushResult = { token: string; ok: boolean; deviceNotRegistered: boolean }

type Ticket = { status?: string; details?: { error?: string } }

/** One POST for all messages; the tickets come back in the same order. Throws on a non-2xx answer or a network error. */
export async function sendExpoPush(fetchFn: typeof fetch, messages: ExpoPushMessage[]): Promise<ExpoPushResult[]> {
  if (messages.length === 0) return []
  const res = await fetchFn(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(messages),
  })
  if (!res.ok) throw new Error(`Expo push: HTTP ${res.status}`)
  const json = (await res.json()) as { data?: Ticket[] }
  const tickets = json.data ?? []
  return messages.map((m, i) => {
    const t = tickets[i]
    return { token: m.to, ok: t?.status === 'ok', deviceNotRegistered: t?.details?.error === 'DeviceNotRegistered' }
  })
}
