import { clearRouteCache } from './routes'
import type { Comment, Heart, Item, PackingItem, Trip } from './types'

/** 마지막으로 불러온 여행 데이터. 인터넷이 끊기면 이걸 보여준다. */
export interface Snapshot {
  trip: Trip
  items: Item[]
  hearts: Heart[]
  comments: Comment[]
  packing?: PackingItem[] // 준비물 기능 전 저장본에는 없음
  savedAt: string
}

const KEY = 'snapshot:v1'

export function saveSnapshot(s: Snapshot, storage: Storage = globalThis.localStorage): void {
  const raw = JSON.stringify(s)
  try {
    storage.setItem(KEY, raw)
  } catch {
    // 공간이 꽉 찼으면 지도 경로 저장본(다시 받을 수 있음)을 비우고 한 번 더
    clearRouteCache(storage)
    try {
      storage.setItem(KEY, raw)
    } catch {
      // 저장 공간이 막혀도 앱은 계속 동작
    }
  }
}

export function loadSnapshot(storage: Storage = globalThis.localStorage): Snapshot | null {
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    const ok = s?.trip?.id && Array.isArray(s.items) && Array.isArray(s.hearts) && Array.isArray(s.comments) && typeof s.savedAt === 'string' && (s.packing === undefined || Array.isArray(s.packing))
    return ok ? (s as Snapshot) : null
  } catch {
    return null
  }
}
