// 중복 알림: 이미 넣은 장소·준비물 찾기 (막지 않고 알리기만, 창은 부르는 쪽에서)
import type { Item, PackingItem } from './types'

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()

/** 이름이 같은지: 공백 전부 무시, 영문 대소문자 무시. 빈 이름은 겹침 아님 */
export function sameName(a: string, b: string): boolean {
  const x = norm(a)
  return x !== '' && x === norm(b)
}

/**
 * 같은 장소인 다른 일정들 (날짜 → 시간 순, 시간 없음은 그날 뒤).
 * 둘 다 구글 장소 번호가 있으면 번호로, 하나라도 없으면 이름으로. target 자신(id)은 뺌.
 */
export function samePlaceItems(
  target: { id?: string; place_name: string; google_place_id: string | null },
  items: Item[],
): Item[] {
  return items
    .filter((i) => i.id !== target.id)
    .filter((i) =>
      target.google_place_id && i.google_place_id
        ? i.google_place_id === target.google_place_id
        : sameName(i.place_name, target.place_name),
    )
    .sort((x, y) => x.day.localeCompare(y.day) || (x.time ?? '99:99').localeCompare(y.time ?? '99:99'))
}

/** 겹치는 준비물: 같이로 넣으면 누구 것이든, 개인으로 넣으면 같이·같은 사람 것만 (상대 개인 것은 괜찮음) */
export function samePackingItems(name: string, owner: PackingItem['owner'], items: PackingItem[]): PackingItem[] {
  return items.filter((i) => sameName(i.name, name) && (owner === 'both' || i.owner === 'both' || i.owner === owner))
}
