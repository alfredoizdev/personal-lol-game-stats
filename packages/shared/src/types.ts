export type Summoner = {
  displayName: string
  gameName: string
  tagLine: string
  summonerLevel: number
  profileIconId: number
  puuid: string
}

export type GameflowPhase =
  | 'None'
  | 'Lobby'
  | 'Matchmaking'
  | 'ReadyCheck'
  | 'ChampSelect'
  | 'GameStart'
  | 'InProgress'
  | 'WaitingForStats'
  | 'PreEndOfGame'
  | 'EndOfGame'
  | 'Reconnect'

export type LeagueStatus =
  | { state: 'CLOSED' }
  | { state: 'STARTING' }
  | { state: 'CONNECTED'; summoner: Summoner; lcu: { port: number } }
  | { state: 'ERROR'; reason: string }
