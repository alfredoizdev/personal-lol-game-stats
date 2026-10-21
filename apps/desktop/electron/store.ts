import Store from 'electron-store'

type Schema = {
  pollIntervalMs: number
}

export const store = new Store<Schema>({
  defaults: { pollIntervalMs: 2000 },
})
