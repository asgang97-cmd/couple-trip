// 목록 맨 위 '다음 일정': 오늘이면 지금 이후 첫 일정, 다른 날이면 그날 첫 일정
import type { Item } from './types'

export interface NextUp {
  lead: Item | null
  label: '다음 일정' | '첫 일정' | null
  /** lead 뒤로 남은 일정 (원래 순서) */
  rest: Item[]
  /** 오늘 이미 지난 일정 (시간이 지금보다 이른 것) */
  passed: Item[]
}

/** items는 이미 시간순(시간 미정은 뒤). now는 여행지 시간 'HH:MM' */
export function splitNextUp(items: Item[], day: string, today: string, now: string): NextUp {
  if (items.length === 0) return { lead: null, label: null, rest: [], passed: [] }
  if (day !== today) return { lead: items[0], label: '첫 일정', rest: items.slice(1), passed: [] }
  const passed = items.filter((i) => i.time !== null && i.time < now)
  const upcoming = items.filter((i) => !passed.includes(i))
  if (upcoming.length === 0) return { lead: null, label: null, rest: [], passed }
  return { lead: upcoming[0], label: '다음 일정', rest: upcoming.slice(1), passed }
}

/** 여행지 시간대의 지금 'HH:MM' (시간대가 없거나 잘못되면 기기 시간) */
export function timeIn(timeZone: string | null | undefined, now: Date): string {
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
  try {
    return new Intl.DateTimeFormat('en-GB', timeZone ? { ...opts, timeZone } : opts).format(now)
  } catch {
    return new Intl.DateTimeFormat('en-GB', opts).format(now)
  }
}
