/**
 * The phone follows the account League is signed in with (owner, 2026-10-28:
 * "si en el cliente me logeo con uno diferente, ¿no debería cambiar en la app?").
 * The desktop relays the client's Riot ID with every phase message; this says
 * whether the phone should switch its active account to it, say it is not
 * linked, or do nothing. Pure; Riot IDs compare ignoring case and spaces.
 */
import type { ClientIdentity } from './live-phase'

export type FollowDecision = { kind: 'switch'; puuid: string } | { kind: 'unlinked'; riotId: string } | null

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()

export function accountToFollow(who: ClientIdentity | null | undefined, accounts: ReadonlyArray<{ puuid: string; gameName: string; tagLine: string }>, activePuuid: string | null): FollowDecision {
  if (!who || accounts.length === 0) return null
  const match = accounts.find((a) => norm(a.gameName) === norm(who.gameName) && norm(a.tagLine) === norm(who.tagLine))
  if (!match) return { kind: 'unlinked', riotId: `${who.gameName.trim()}#${who.tagLine.trim()}` }
  return match.puuid === activePuuid ? null : { kind: 'switch', puuid: match.puuid }
}
