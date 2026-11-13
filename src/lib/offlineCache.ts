import type { Comment, Heart, Item, Trip } from './types'

/** 마지막으로 불러온 여행 데이터. 인터넷이 끊기면 이걸 보여준다. */
export interface Snapshot {
  trip: Trip
  items: Item[]
  hearts: Heart[]
  comments: Comment[]
  savedAt: string
}

const KEY = 'snapshot:v1'

export function saveSnapshot(s: Snapshot, storage: Storage = globalThis.localStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify(s))
  } catch {
    // 저장 공간이 막혀도 앱은 계속 동작
  }
}

export function loadSnapshot(storage: Storage = globalThis.localStorage): Snapshot | null {
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    const ok = s?.trip?.id && Array.isArray(s.items) && Array.isArray(s.hearts) && Array.isArray(s.comments) && typeof s.savedAt === 'string'
    return ok ? (s as Snapshot) : null
  } catch {
    return null
  }
}
