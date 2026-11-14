import { describe, expect, test } from 'vitest'
import { formatMoney, sumKrw, toKrw } from './money'
import type { Item } from './types'

describe('toKrw', () => {
  test('현지통화 → 원화, 정수 반올림', () => expect(toKrw(1200, 'JPY', 9.2)).toBe(11040))
  test('KRW는 환율 없이 그대로', () => expect(toKrw(5000, 'KRW', null)).toBe(5000))
  test('환율 없으면 null', () => expect(toKrw(10, 'JPY', null)).toBeNull())
})

describe('formatMoney', () => {
  test('엔화는 짧은 기호(JP¥ 아님)', () => expect(formatMoney(1200, 'JPY')).toBe('¥1,200'))
  test('잘못된 통화 코드여도 화면이 멈추지 않고 숫자+코드로', () => expect(formatMoney(1200, 'JP')).toBe('1,200 JP'))
  test('원화', () => expect(formatMoney(11040, 'KRW')).toBe('₩11,040'))
})

function cost(amount: number | null, currency: string): Item {
  return {
    id: String(Math.random()), trip_id: 't', day: '2027-01-10', time: null, place_name: '', memo: '',
    booking_code: '', booking_url: '', cost_amount: amount, cost_currency: currency, lat: null, lng: null,
    google_place_id: null, created_by: 'a', sort_order: 0, created_at: '', updated_at: '',
  }
}

describe('sumKrw', () => {
  const items = [cost(1000, 'JPY'), cost(5000, 'KRW'), cost(500, 'JPY'), cost(null, 'JPY')]
  test('환율 있으면 전부 원화로 합산', () => {
    expect(sumKrw(items, 'JPY', 9)).toEqual({ totalKrw: 18500, unconvertedCount: 0 })
  })
  test('환율 없으면 KRW만 합산하고 나머지는 개수로', () => {
    expect(sumKrw(items, 'JPY', null)).toEqual({ totalKrw: 5000, unconvertedCount: 2 })
  })
})
