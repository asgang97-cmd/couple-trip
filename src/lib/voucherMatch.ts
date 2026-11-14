// 바우처 PDF 글자에서 "어느 일정·날짜 것인지" 추천하기 (사용자가 저장 전에 확인)
import type { Item } from './types'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MON = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?'

/** 진짜 있는 날짜면 'YYYY-MM-DD' */
function toDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const t = new Date(Date.UTC(y, m - 1, d))
  if (t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const PATTERNS: { re: RegExp; read: (m: RegExpExecArray) => [number, number, number] }[] = [
  // 2027-01-10 · 2027.1.10 · 2027/01/10
  { re: /(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/g, read: (m) => [+m[1], +m[2], +m[3]] },
  // 2027년 1월 10일 · 2027年1月10日
  { re: /(\d{4})\s*[년年]\s*(\d{1,2})\s*[월月]\s*(\d{1,2})/g, read: (m) => [+m[1], +m[2], +m[3]] },
  // 10 Jan 2027
  { re: new RegExp(`(\\d{1,2})\\s+${MON},?\\s+(\\d{4})`, 'gi'), read: (m) => [+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]] },
  // Jan 10, 2027 · January 10 2027
  { re: new RegExp(`${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`, 'gi'), read: (m) => [+m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2]] },
]

/** 글에 나오는 날짜들 (나온 순서, 중복 없이) */
export function findDates(text: string): string[] {
  const found: { at: number; date: string }[] = []
  for (const { re, read } of PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const date = toDate(...read(m))
      if (date) found.push({ at: m.index, date })
    }
  }
  found.sort((a, b) => a.at - b.at)
  return [...new Set(found.map((f) => f.date))]
}

/** 비교용: 대문자, 공백·하이픈·점 없이 */
const norm = (s: string) => s.toUpperCase().replace(/[\s\-.]/g, '')

export type Suggestion =
  | { itemId: string; day: string; reason: 'code'; code: string }
  | { itemId: null; day: string; reason: 'date' }
  | { itemId: null; day: null; reason: 'none' }

/** 예약번호가 맞는 일정 → 그 일정, 아니면 여행 기간 안의 첫 날짜, 둘 다 없으면 추천 없음 */
export function suggestLink(text: string, items: Item[], tripDays: string[]): Suggestion {
  const t = norm(text)
  for (const it of items) {
    const code = norm(it.booking_code)
    if (code.length >= 3 && t.includes(code)) return { itemId: it.id, day: it.day, reason: 'code', code: it.booking_code }
  }
  const inTrip = new Set(tripDays)
  const day = findDates(text).find((d) => inTrip.has(d))
  return day ? { itemId: null, day, reason: 'date' } : { itemId: null, day: null, reason: 'none' }
}
