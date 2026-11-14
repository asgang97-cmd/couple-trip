import { describe, expect, test } from 'vitest'
import { makeItem } from '../test-fixtures'
import { findDates, suggestLink } from './voucherMatch'

describe('findDates: 여러 날짜 표기를 YYYY-MM-DD로', () => {
  test.each([
    ['출발 2027-01-10 09:30', '2027-01-10'],
    ['Date: 2027.1.10', '2027-01-10'],
    ['2027/01/10', '2027-01-10'],
    ['2027년 1월 10일 (일)', '2027-01-10'],
    ['2027年1月10日', '2027-01-10'],
    ['Check-in 10 Jan 2027', '2027-01-10'],
    ['January 10, 2027', '2027-01-10'],
    ['Sun, Jan 10 2027', '2027-01-10'],
  ])('%s', (text, expected) => expect(findDates(text)).toContain(expected))

  test('말이 안 되는 날짜는 버림', () => expect(findDates('2027-13-40 2027-02-30')).toEqual([]))
  test('중복 없이 나온 순서대로', () => expect(findDates('2027-01-12 그리고 2027.1.10, 2027-01-12')).toEqual(['2027-01-12', '2027-01-10']))
})

describe('suggestLink: 일정·날짜 추천', () => {
  const days = ['2027-01-10', '2027-01-11', '2027-01-12']
  const flight = makeItem({ id: 'f', day: '2027-01-10', booking_code: 'KE-703', place_name: '나리타 도착' })
  const hotel = makeItem({ id: 'h', day: '2027-01-11', booking_code: 'tbl 2291', place_name: '호텔' })
  const noCode = makeItem({ id: 'n', booking_code: '' })

  test('예약번호가 있으면 그 일정과 날짜 (대소문자·공백·하이픈 무시)', () => {
    expect(suggestLink('Booking ref: ke703 / 10 Jan 2027', [noCode, flight, hotel], days)).toEqual({ itemId: 'f', day: '2027-01-10', reason: 'code', code: 'KE-703' })
    expect(suggestLink('예약번호 TBL-2291', [flight, hotel], days)).toMatchObject({ itemId: 'h', day: '2027-01-11' })
  })

  test('예약번호가 없으면 여행 기간 안의 첫 날짜', () => {
    expect(suggestLink('투숙일 2026-12-01 ~ 2027-01-12', [flight], days)).toEqual({ itemId: null, day: '2027-01-12', reason: 'date' })
  })

  test('기간 밖 날짜만 있으면 추천 없음', () => {
    expect(suggestLink('2026-05-05', [flight], days)).toEqual({ itemId: null, day: null, reason: 'none' })
  })

  test('너무 짧은 예약번호(2자 이하)는 우연히 겹칠 수 있어 무시', () => {
    const short = makeItem({ id: 's', booking_code: 'A1' })
    expect(suggestLink('A1 A1 A1', [short], days).itemId).toBeNull()
  })

  test('같은 예약번호가 여러 일정에 있으면 첫 일정', () => {
    const again = makeItem({ id: 'f2', day: '2027-01-12', booking_code: 'KE703' })
    expect(suggestLink('KE703', [flight, again], days).itemId).toBe('f')
  })
})
