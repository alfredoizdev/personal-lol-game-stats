/** TanStack Query keys for match data. Ids are per account (puuid) so switching accounts never mixes lists. */
export const matchKeys = {
  ids: (puuid: string | undefined, count: number) => ['match-ids', puuid, count] as const,
  detail: (matchId: string) => ['match-detail', matchId] as const,
  timeline: (matchId: string) => ['match-timeline', matchId] as const,
}
