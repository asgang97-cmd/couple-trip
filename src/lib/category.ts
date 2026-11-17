// 일정 종류: 숙소·교통·식사·관광·쇼핑·기타 (안 골라도 됨)
import type { Item } from './types'

export type Category = 'stay' | 'move' | 'food' | 'sight' | 'shop' | 'etc'
export interface CategoryInfo { value: Category; label: string; icon: string }

/** 화면에 보이는 순서 그대로 */
export const CATEGORIES: readonly CategoryInfo[] = [
  { value: 'stay', label: '숙소', icon: '🏨' },
  { value: 'move', label: '교통', icon: '🚃' },
  { value: 'food', label: '식사', icon: '🍜' },
  { value: 'sight', label: '관광', icon: '⛩️' },
  { value: 'shop', label: '쇼핑', icon: '🛍️' },
  { value: 'etc', label: '기타', icon: '📌' },
]

/** 종류 정보 (없으면 null: 예전 일정·안 고른 일정) */
export function categoryInfo(c: Category | null | undefined): CategoryInfo | null {
  return CATEGORIES.find((x) => x.value === c) ?? null
}

/** 그 종류 일정만. 기타에는 종류 없는 일정도 넣음 (어디에도 안 빠지게) */
export function itemsOfCategory(items: Item[], c: Category): Item[] {
  return items.filter((i) => (c === 'etc' ? i.category == null || i.category === 'etc' : i.category === c))
}
