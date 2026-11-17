import { describe, expect, test } from 'vitest'
import { makeItem } from '../test-fixtures'
import { splitNextUp, timeIn } from './nextUp'

const DAY = '2027-01-10'
const a = makeItem({ id: 'a', day: DAY, time: '09:00' })
const b = makeItem({ id: 'b', day: DAY, time: '13:00' })
const c = makeItem({ id: 'c', day: DAY, time: '19:00' })
const u = makeItem({ id: 'u', day: DAY, time: null })
const items = [a, b, c, u] // 이미 시간순 (시간 미정은 뒤)
const ids = (xs: { id: string }[]) => xs.map((x) => x.id)

describe('splitNextUp', () => {
  test('오늘: 지금 이후 첫 일정이 "다음 일정", 지난 건 따로', () => {
    const r = splitNextUp(items, DAY, DAY, '12:30')
    expect(r.lead?.id).toBe('b')
    expect(r.label).toBe('다음 일정')
    expect(ids(r.rest)).toEqual(['c', 'u'])
    expect(ids(r.passed)).toEqual(['a'])
  })

  test('오늘: 딱 그 시각인 일정은 아직 다음 일정', () => {
    expect(splitNextUp(items, DAY, DAY, '13:00').lead?.id).toBe('b')
  })

  test('오늘: 시간 있는 일정이 다 지나면 시간 미정이 다음', () => {
    const r = splitNextUp(items, DAY, DAY, '20:00')
    expect(r.lead?.id).toBe('u')
    expect(ids(r.passed)).toEqual(['a', 'b', 'c'])
  })

  test('오늘: 전부 지났으면 다음 일정 없음', () => {
    const r = splitNextUp([a, b], DAY, DAY, '23:00')
    expect(r.lead).toBeNull()
    expect(r.label).toBeNull()
    expect(ids(r.passed)).toEqual(['a', 'b'])
  })

  test('다른 날: 그날 첫 일정이 "첫 일정", 지난 것 없음', () => {
    const r = splitNextUp(items, DAY, '2027-01-08', '12:30')
    expect(r.lead?.id).toBe('a')
    expect(r.label).toBe('첫 일정')
    expect(ids(r.rest)).toEqual(['b', 'c', 'u'])
    expect(r.passed).toEqual([])
  })

  test('일정 없으면 비어 있음', () => {
    expect(splitNextUp([], DAY, DAY, '12:00')).toEqual({ lead: null, label: null, rest: [], passed: [] })
  })
})

describe('timeIn', () => {
  test('여행지 시간대의 HH:MM (24시간)', () => {
    expect(timeIn('Asia/Tokyo', new Date('2027-01-10T03:05:00Z'))).toBe('12:05')
    expect(timeIn('Asia/Tokyo', new Date('2027-01-10T15:00:00Z'))).toBe('00:00')
  })
})
