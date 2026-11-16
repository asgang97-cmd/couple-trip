// 영업시간·휴무일 경고: 구글 영업시간(Places API New 형식)으로 그 날짜·시각을 판단
import { toDateString } from './dates'

export interface HoursPoint { day: number; hour: number; minute: number; date?: { year: number; month: number; day: number } }
/** close 없음 = 24시간 영업 */
export interface HoursPeriod { open: HoursPoint; close?: HoursPoint }
/** null = 구글에 그 정보가 없음 */
export interface PlaceHours { regular: HoursPeriod[] | null; current: HoursPeriod[] | null }

export type HoursWarning =
  | { kind: 'closedDay'; weekday: number }
  | { kind: 'notOpen'; at: string; opens: string }
  | { kind: 'closed'; at: string; closedAt: string }
  | { kind: 'closingSoon'; closes: string; minutesLeft: number }

const DAY = 1440
const WEEK = 7 * DAY
const SOON_MIN = 60 // 도착 후 이 시간(분) 안에 닫으면 경고
const WEEKDAYS = '일월화수목금토'

const dayNumber = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 86_400_000
const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return dayNumber(y, m, d)
}
const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
const hhmm = (min: number) => {
  const m = ((min % DAY) + DAY) % DAY
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** 각 영업 구간을 "그 날짜 0시 기준 분" [start, end)로. 24시간 영업이 있으면 null */
function intervalsFor(periods: HoursPeriod[], target: number): { start: number; end: number }[] | null {
  const weekday = new Date(target * 86_400_000).getUTCDay()
  const out: { start: number; end: number }[] = []
  for (const { open, close } of periods) {
    if (!close) return null
    const openOff = open.date
      ? dayNumber(open.date.year, open.date.month, open.date.day) - target
      : ((open.day - weekday + 7 + 3) % 7) - 3 // 가장 가까운 같은 요일 (−3~+3일)
    const start = openOff * DAY + open.hour * 60 + open.minute
    let end: number
    if (open.date && close.date) end = (dayNumber(close.date.year, close.date.month, close.date.day) - target) * DAY + close.hour * 60 + close.minute
    else {
      const span = (close.day * DAY + close.hour * 60 + close.minute - (open.day * DAY + open.hour * 60 + open.minute) + WEEK) % WEEK
      end = start + (span || WEEK)
    }
    out.push({ start, end })
  }
  return out
}

/**
 * 그 날짜·시각에 문제가 있으면 경고, 없거나 확실하지 않으면 null.
 * today부터 7일 안이면 특별 영업일이 반영된 current, 아니면 매주 반복되는 regular.
 */
export function checkHours(hours: PlaceHours, day: string, time: string | null, today: string): HoursWarning | null {
  const target = parseDay(day)
  const ahead = target - parseDay(today)
  const periods = ahead >= 0 && ahead <= 6 && hours.current ? hours.current : hours.regular
  if (!periods) return null
  const intervals = intervalsFor(periods, target)
  if (!intervals) return null // 24시간

  const startsToday = intervals.filter((i) => i.start >= 0 && i.start < DAY)
  const weekday = new Date(target * 86_400_000).getUTCDay()
  if (time === null) return startsToday.length ? null : { kind: 'closedDay', weekday }

  const t = minutesOf(time)
  const cover = intervals.find((i) => i.start <= t && t < i.end)
  if (cover) {
    const left = cover.end - t
    return left <= SOON_MIN ? { kind: 'closingSoon', closes: hhmm(cover.end), minutesLeft: left } : null
  }
  if (!startsToday.length) return { kind: 'closedDay', weekday }
  const later = startsToday.filter((i) => i.start > t).sort((a, b) => a.start - b.start)[0]
  if (later) return { kind: 'notOpen', at: time, opens: hhmm(later.start) }
  const ended = intervals.filter((i) => i.end <= t).sort((a, b) => b.end - a.end)[0]
  return ended ? { kind: 'closed', at: time, closedAt: hhmm(ended.end) } : null
}

export function hoursMessage(w: HoursWarning): string {
  switch (w.kind) {
    case 'closedDay':
      return `⚠️ 이날 휴무 (${WEEKDAYS[w.weekday]}요일)`
    case 'notOpen':
      return `⚠️ ${w.at}엔 아직 안 열어요 (${w.opens} 오픈)`
    case 'closed':
      return `⚠️ ${w.at}엔 문 닫아요 (${w.closedAt} 마감)`
    case 'closingSoon':
      return `⚠️ ${w.closes} 마감 · ${w.minutesLeft}분 남아요`
  }
}

/** 여행지 시간대 기준 오늘 'YYYY-MM-DD' (시간대가 없거나 잘못되면 기기 시간대) */
export function todayIn(timeZone: string | null | undefined, now: Date): string {
  if (timeZone) {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    } catch {
      // 잘못된 시간대
    }
  }
  return toDateString(now)
}
