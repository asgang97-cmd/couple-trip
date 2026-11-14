import type { Item } from './types'

const DAY_MS = 86_400_000

/** 'YYYY-MM-DD' → 그 날의 로컬 자정. new Date('YYYY-MM-DD')는 UTC로 해석되므로 쓰지 않는다. */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Date → 로컬 기준 'YYYY-MM-DD' */
export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 오늘(now의 로컬 날짜)부터 target까지 남은 날 수. 당일 0, 지나면 음수. */
export function daysUntil(target: string, now: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // round: 서머타임 등으로 하루가 23/25시간이어도 정수로 맞춘다
  return Math.round((parseLocalDate(target).getTime() - today.getTime()) / DAY_MS)
}

/** 첫 화면 문구: 'D-9' / 'D-DAY' / '여행 3일차' / '다녀온 지 2일' */
export function tripPhaseLabel(start: string, end: string, now: Date): string {
  const toStart = daysUntil(start, now)
  if (toStart > 0) return `D-${toStart}`
  if (toStart === 0) return 'D-DAY'
  const toEnd = daysUntil(end, now)
  if (toEnd >= 0) return `여행 ${-toStart + 1}일차`
  return `다녀온 지 ${-toEnd}일`
}

/** start~end(포함)의 모든 날짜 */
export function tripDays(start: string, end: string): string[] {
  const days: string[] = []
  const cur = parseLocalDate(start)
  const last = parseLocalDate(end)
  while (cur <= last) {
    days.push(toDateString(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function compareItems(a: Item, b: Item): number {
  // 시간 있는 항목이 먼저, 시간 미정은 뒤로
  if ((a.time === null) !== (b.time === null)) return a.time === null ? 1 : -1
  if (a.time !== null && b.time !== null && a.time !== b.time) return a.time < b.time ? -1 : 1
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
}

/** 날짜별로 묶고 정렬. days에 없는 날짜의 항목은 제외. */
export function groupItemsByDay(items: Item[], days: string[]): Record<string, Item[]> {
  const groups: Record<string, Item[]> = {}
  for (const day of days) groups[day] = []
  for (const it of items) groups[it.day]?.push(it)
  for (const day of days) groups[day].sort(compareItems)
  return groups
}

/** 여행 기간(days) 안의 일정만. 기간이 줄어 목록에서 안 보이는 일정은 합계에서도 뺀다. */
export function itemsInTrip(items: Item[], days: string[]): Item[] {
  const set = new Set(days)
  return items.filter((it) => set.has(it.day))
}

/** 그날 맨 뒤에 붙일 순서 번호 */
export function nextSortOrder(dayItems: Item[]): number {
  return Math.max(0, ...dayItems.map((i) => i.sort_order)) + 1
}

/** 기간을 start~end로 바꾸면 밖으로 밀려나(숨겨지)는 일정 개수 */
export function countHiddenItems(items: Item[], start: string, end: string): number {
  return items.length - itemsInTrip(items, tripDays(start, end)).length
}
