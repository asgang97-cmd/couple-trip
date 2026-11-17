import { describe, expect, test } from 'vitest'
import { makeItem } from '../test-fixtures'
import { CATEGORIES, categoryInfo, itemsOfCategory } from './category'

describe('종류 정의', () => {
  test('6개, 이 순서', () => {
    expect(CATEGORIES.map((c) => c.value)).toEqual(['stay', 'move', 'food', 'sight', 'shop', 'etc'])
    expect(CATEGORIES.map((c) => `${c.icon} ${c.label}`)).toEqual(['🏨 숙소', '🚃 교통', '🍜 식사', '⛩️ 관광', '🛍️ 쇼핑', '📌 기타'])
  })
  test('categoryInfo: 값이면 정보, 없으면 null', () => {
    expect(categoryInfo('food')).toEqual({ value: 'food', label: '식사', icon: '🍜' })
    expect(categoryInfo(null)).toBeNull()
    expect(categoryInfo(undefined)).toBeNull()
  })
})

describe('itemsOfCategory', () => {
  const food = makeItem({ category: 'food' })
  const etc = makeItem({ category: 'etc' })
  const none = makeItem({ category: null })
  const old = makeItem()
  delete (old as { category?: unknown }).category // 009 실행 전 데이터: 칸 자체가 없음
  const all = [food, etc, none, old]

  test('그 종류만', () => {
    expect(itemsOfCategory(all, 'food')).toEqual([food])
    expect(itemsOfCategory(all, 'stay')).toEqual([])
  })
  test('기타는 종류 없는 일정도 포함', () => {
    expect(itemsOfCategory(all, 'etc')).toEqual([etc, none, old])
  })
})
