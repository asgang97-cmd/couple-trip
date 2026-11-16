// 영업시간·휴무일 경고: 구글 영업시간(Places API New 형식)으로 그 날짜·시각을 판단
import { toDateString } from './dates'

export interface HoursPoint { day: number; hour: number; minute: number; date?: { year: number; month: number; day: number } }
/** close 없음 = 24시간 영업 */
export interface HoursPeriod { open: HoursPoint; close?: HoursPoint }
/** null = 구글에 그 정보가 없음. fetchedAt = 받은 시각(ms) — current는 받은 날부터 7일치라서 */
export interface PlaceHours { regular: HoursPeriod[] | null; current: HoursPeriod[] | null; fetchedAt?: number }

export type HoursWarning =
  | { kind: 'closedDay'; weekday: number }
  | { kind: 'notOpen'; at: string; opens: string }
  | { kind: 'closed'; at: string; closedAt: string }
  | { kind: 'closingSoon'; closes: string; minutesLeft: number }

const DAY = 1440
const WEEK = 7 * DAY
const SOON_MIN = 60 // 도착 후 이 시간(분) 안에 닫으면 경고
const SPILL_MIN = 360 // 전날 밤 영업이 이 시각(06:00)을 넘겨야 그날도 영업한 날로 봄
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
    const span = (close.day * DAY + close.hour * 60 + close.minute - (open.day * DAY + open.hour * 60 + open.minute) + WEEK) % WEEK || WEEK
    const at = open.hour * 60 + open.minute
    if (open.date) {
      const start = (dayNumber(open.date.year, open.date.month, open.date.day) - target) * DAY + at
      const end = close.date ? (dayNumber(close.date.year, close.date.month, close.date.day) - target) * DAY + close.hour * 60 + close.minute : start + span
      out.push({ start, end })
    } else {
      // 매주 반복: 이번 주 그 요일(0~6일 뒤)과 지난주 그 요일(1~7일 전) 둘 다 → 며칠 전에 시작한 긴 구간도 그날을 덮음
      const base = ((open.day - weekday + 7) % 7) * DAY + at
      for (const start of [base, base - WEEK]) out.push({ start, end: start + span })
    }
  }
  // 붙어 있거나 1분 틈인 구간은 하나로 (자정에 이어지는 영업, 23:59 마감 → 00:00 오픈)
  out.sort((a, b) => a.start - b.start)
  const merged: { start: number; end: number }[] = []
  for (const i of out) {
    const last = merged[merged.length - 1]
    if (last && i.start <= last.end + 1) last.end = Math.max(last.end, i.end)
    else merged.push({ ...i })
  }
  return merged
}

/**
 * 그 날짜·시각에 문제가 있으면 경고, 없거나 확실하지 않으면 null.
 * currentFrom = current를 받은 날(여행지 날짜). 그날부터 7일 안이면 특별 영업일이 반영된 current,
 * 아니면 매주 반복되는 regular. (current엔 휴무일이 아예 없어서, 범위 밖 날짜에 쓰면 전부 휴무로 보임)
 */
export function checkHours(hours: PlaceHours, day: string, time: string | null, currentFrom: string): HoursWarning | null {
  const target = parseDay(day)
  const ahead = target - parseDay(currentFrom)
  const periods = ahead >= 0 && ahead <= 6 && hours.current ? hours.current : hours.regular
  if (!periods) return null
  const intervals = intervalsFor(periods, target)
  if (!intervals) return null // 24시간

  const startsToday = intervals.filter((i) => i.start >= 0 && i.start < DAY)
  // 그날 영업한 날 = 그날 시작하는 구간이 있거나, 전부터 이어진 영업이 06:00을 넘김 (새벽까지만 걸친 날은 휴무)
  const openThatDay = startsToday.length > 0 || intervals.some((i) => i.start < 0 && i.end > SPILL_MIN)
  const weekday = new Date(target * 86_400_000).getUTCDay()
  if (time === null) return openThatDay ? null : { kind: 'closedDay', weekday }

  const t = minutesOf(time)
  const cover = intervals.find((i) => i.start <= t && t < i.end)
  if (cover) {
    const left = cover.end - t
    return left <= SOON_MIN ? { kind: 'closingSoon', closes: hhmm(cover.end), minutesLeft: left } : null
  }
  if (!openThatDay) return { kind: 'closedDay', weekday }
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
