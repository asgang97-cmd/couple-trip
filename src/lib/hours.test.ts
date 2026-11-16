import { describe, expect, test } from 'vitest'
import { checkHours, hoursMessage, todayIn, type HoursPeriod, type PlaceHours } from './hours'

// 2027-01-10 일요일, 01-11 월요일, 01-12 화요일
const MON = '2027-01-11'
const TUE = '2027-01-12'
const TODAY_FAR = '2026-12-01' // 7일 밖 → 매주 영업시간 기준

/** 요일들마다 같은 영업 구간 (nextDay = 다음 날 새벽에 닫음) */
function daily(days: number[], open: [number, number], close: [number, number], nextDay = false): HoursPeriod[] {
  return days.map((d) => ({
    open: { day: d, hour: open[0], minute: open[1] },
    close: { day: nextDay ? (d + 1) % 7 : d, hour: close[0], minute: close[1] },
  }))
}
const regular = (periods: HoursPeriod[]): PlaceHours => ({ regular: periods, current: null })
// 월요일 휴무, 나머지 11:00–21:00
const R = regular(daily([0, 2, 3, 4, 5, 6], [11, 0], [21, 0]))
const check = (h: PlaceHours, day: string, time: string | null, today = TODAY_FAR) => checkHours(h, day, time, today)

describe('checkHours 기본', () => {
  test('정기 휴무일 (시간 미정이어도)', () => {
    const w = check(R, MON, null)
    expect(w).toEqual({ kind: 'closedDay', weekday: 1 })
    expect(hoursMessage(w!)).toBe('⚠️ 이날 휴무 (월요일)')
    expect(check(R, MON, '12:00')).toEqual({ kind: 'closedDay', weekday: 1 })
  })

  test('아직 안 열었을 때', () => {
    const w = check(R, TUE, '10:00')
    expect(w).toEqual({ kind: 'notOpen', at: '10:00', opens: '11:00' })
    expect(hoursMessage(w!)).toBe('⚠️ 10:00엔 아직 안 열어요 (11:00 오픈)')
  })

  test('이미 닫았을 때', () => {
    const w = check(R, TUE, '22:00')
    expect(w).toEqual({ kind: 'closed', at: '22:00', closedAt: '21:00' })
    expect(hoursMessage(w!)).toBe('⚠️ 22:00엔 문 닫아요 (21:00 마감)')
  })

  test('1시간 안에 마감 (60분까지 포함)', () => {
    const w = check(R, TUE, '20:30')
    expect(w).toEqual({ kind: 'closingSoon', closes: '21:00', minutesLeft: 30 })
    expect(hoursMessage(w!)).toBe('⚠️ 21:00 마감 · 30분 남아요')
    expect(check(R, TUE, '20:00')).toEqual({ kind: 'closingSoon', closes: '21:00', minutesLeft: 60 })
    expect(check(R, TUE, '19:59')).toBeNull()
  })

  test('영업 중이면, 시간 미정 영업일이면 경고 없음', () => {
    expect(check(R, TUE, '12:00')).toBeNull()
    expect(check(R, TUE, null)).toBeNull()
  })
})

describe('checkHours 까다로운 영업시간', () => {
  test('새벽까지 영업 (18:00–02:00)', () => {
    const late = regular(daily([0, 1, 2, 3, 4, 5, 6], [18, 0], [2, 0], true))
    expect(check(late, TUE, '01:30')).toEqual({ kind: 'closingSoon', closes: '02:00', minutesLeft: 30 })
    expect(check(late, TUE, null)).toBeNull()
    expect(check(late, TUE, '23:00')).toBeNull()
  })

  test('점심·저녁 두 구간 (11–14, 17–22)', () => {
    const two = regular([...daily([2], [11, 0], [14, 0]), ...daily([2], [17, 0], [22, 0])])
    expect(check(two, TUE, '15:00')).toEqual({ kind: 'notOpen', at: '15:00', opens: '17:00' })
    expect(check(two, TUE, '14:30')).toEqual({ kind: 'notOpen', at: '14:30', opens: '17:00' })
    expect(check(two, TUE, '22:30')).toEqual({ kind: 'closed', at: '22:30', closedAt: '22:00' })
  })

  test('24시간 영업이면 경고 없음', () => {
    expect(check(regular([{ open: { day: 0, hour: 0, minute: 0 } }]), MON, '03:00')).toBeNull()
  })

  test('영업시간 정보가 없으면 경고 없음', () => {
    expect(check({ regular: null, current: null }, MON, '10:00')).toBeNull()
  })
})

describe('checkHours 7일 안쪽은 특별 영업일 반영', () => {
  // current: 1/10~1/16 중 1/12(화)만 임시 휴무
  const dated = (d: number, wd: number): HoursPeriod => ({
    open: { day: wd, hour: 11, minute: 0, date: { year: 2027, month: 1, day: d } },
    close: { day: wd, hour: 21, minute: 0, date: { year: 2027, month: 1, day: d } },
  })
  const H: PlaceHours = { regular: R.regular, current: [dated(10, 0), dated(13, 3), dated(14, 4), dated(15, 5), dated(16, 6)] }

  test('여행 중(7일 안): 임시 휴무 잡음', () => {
    expect(check(H, TUE, null, '2027-01-10')).toEqual({ kind: 'closedDay', weekday: 2 })
  })

  test('7일 밖: 매주 영업시간 기준', () => {
    expect(check(H, TUE, null, '2027-01-01')).toBeNull()
  })
})

describe('todayIn', () => {
  test('여행지 시간대 기준 오늘', () => {
    expect(todayIn('Asia/Tokyo', new Date('2027-01-10T16:00:00Z'))).toBe('2027-01-11')
  })
  test('잘못된 시간대면 기기 시간대로 (에러 없음)', () => {
    expect(todayIn('Not/AZone', new Date('2027-01-10T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
