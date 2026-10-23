import { createContext, useContext, type ReactNode } from 'react'
import { useLiveSnapshot, type LiveFeed } from '@/hooks/useLiveSnapshot'

const LiveFeedContext = createContext<LiveFeed | null>(null)

/** One Realtime subscription for the whole signed-in app, so every tab can react to the game (auto-open Live, alerts). */
export function LiveFeedProvider({ children }: { children: ReactNode }) {
  const feed = useLiveSnapshot()
  return <LiveFeedContext.Provider value={feed}>{children}</LiveFeedContext.Provider>
}

export function useLiveFeed(): LiveFeed {
  const feed = useContext(LiveFeedContext)
  if (!feed) throw new Error('useLiveFeed must be used inside LiveFeedProvider')
  return feed
}
