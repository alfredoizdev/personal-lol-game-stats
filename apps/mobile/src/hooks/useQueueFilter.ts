import { useEffect, useSyncExternalStore } from 'react'
import type { QueueFilter } from '@lpp/shared'
import { loadQueueFilter, saveQueueFilter } from '@/lib/queue-filter'

// One value for the whole app (Matches and Performance show the same choice), restored from the device once.
let current: QueueFilter = 'all'
let restored = false
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const set = (f: QueueFilter) => {
  current = f
  listeners.forEach((l) => l())
}

export function useQueueFilter(): [QueueFilter, (f: QueueFilter) => void] {
  const value = useSyncExternalStore(subscribe, () => current, () => current)
  useEffect(() => {
    if (restored) return
    restored = true
    void loadQueueFilter().then((f) => set(f))
  }, [])
  const change = (f: QueueFilter) => {
    set(f)
    void saveQueueFilter(f)
  }
  return [value, change]
}
