import AsyncStorage from '@react-native-async-storage/async-storage'
import { QUEUE_FILTERS, type QueueFilter } from '@lpp/shared'

const KEY = 'lpp.queueFilter'

/** The queue filter (All / Ranked / Normal) last chosen on Matches or Performance; a device convenience. */
export async function loadQueueFilter(): Promise<QueueFilter> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    return v && (QUEUE_FILTERS as readonly string[]).includes(v) ? (v as QueueFilter) : 'all'
  } catch {
    return 'all'
  }
}

export async function saveQueueFilter(filter: QueueFilter): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, filter)
  } catch {
    /* best effort */
  }
}
