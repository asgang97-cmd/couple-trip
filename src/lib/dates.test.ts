import { describe, expect, test } from 'vitest'
import { daysUntil, groupItemsByDay, parseLocalDate, toDateString, tripDays } from './dates'
import type { Item } from './types'

describe('parseLocalDate / toDateString', () => {
  test('parseLocalDate는 로컬 자정', () => {
    const d = parseLocalDate('2027-01-10')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 0, 10, 0])
  })

  test('toDateString 왕복', () => {
    expect(toDateString(parseLocalDate('2027-02-01'))).toBe('2027-02-01')
  })
})

describe('daysUntil', () => {
  test('기본', () => expect(daysUntil('2027-01-10', new Date(2027, 0, 1, 12, 0))).toBe(9))
  test('자정 직후', () => expect(daysUntil('2027-01-10', new Date(2027, 0, 1, 0, 30))).toBe(9))
  test('당일 밤', () => expect(daysUntil('2027-01-10', new Date(2027, 0, 10, 23, 59))).toBe(0))
  test('지난 날', () => expect(daysUntil('2027-01-10', new Date(2027, 0, 12, 9, 0))).toBe(-2))
})

describe('tripDays', () => {
  test('월 경계', () => {
    expect(tripDays('2027-01-30', '2027-02-01')).toEqual(['2027-01-30', '2027-01-31', '2027-02-01'])
  })
})

function item(over: Partial<Item>): Item {
  return {
    id: Math.random().toString(36),
    trip_id: 't',
    day: '2027-01-10',
    time: null,
    place_name: '',
    memo: '',
    booking_code: '',
    booking_url: '',
    cost_amount: null,
    cost_currency: 'JPY',
    lat: null,
    lng: null,
    google_place_id: null,
    created_by: 'a',
    sort_order: 0,
    created_at: '2026-11-14T00:00:00Z',
    updated_at: '2026-11-14T00:00:00Z',
    ...over,
  }
}

describe('groupItemsByDay', () => {
  test('시간순, 시간 없는 건 뒤에 sort_order순, 빈 날도 키 존재, days에 없는 날짜 항목은 제외', () => {
    const D1 = '2027-01-10'
    const D2 = '2027-01-11'
    const items = [
      item({ day: D1, time: '14:00', place_name: 'p14' }),
      item({ day: D1, time: null, sort_order: 2, place_name: 'n2' }),
      item({ day: D1, time: '09:30', place_name: 'p0930' }),
      item({ day: D1, time: null, sort_order: 1, place_name: 'n1' }),
      item({ day: '2027-03-01', place_name: 'outside' }),
    ]
    const g = groupItemsByDay(items, [D1, D2])
    expect(Object.keys(g)).toEqual([D1, D2])
    expect(g[D1].map((i) => i.place_name)).toEqual(['p0930', 'p14', 'n1', 'n2'])
    expect(g[D2]).toEqual([])
  })
})
