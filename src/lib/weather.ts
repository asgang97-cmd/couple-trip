// 날짜 탭 날씨: 아이콘·글, 그날 위치 고르기, 예보 밖 날짜에 쓸 과거 날짜
import type { Item } from './types'

export interface DayWeather { code: number; max: number; min: number; rain: number | null }
export type Past = '작년' | '재작년'
/** past = 예보가 아니라 과거 기록 (null이면 예보) */
export interface TabWeather extends DayWeather { past: Past | null }
export interface Loc { lat: number; lng: number }

const RAIN_SHOW = 40 // 비 올 확률이 이 이상이면 ☔ 표시

/** WMO 날씨 코드 → [아이콘, 읽는 글] */
function kind(code: number): [string, string] {
  if (code === 0) return ['☀️', '맑음']
  if (code === 1) return ['🌤', '구름 조금']
  if (code === 2) return ['⛅', '구름 조금']
  if (code === 3) return ['☁️', '흐림']
  if (code === 45 || code === 48) return ['🌫', '안개']
  if ((code >= 51 && code <= 57) || (code >= 80 && code <= 82)) return ['🌦', '소나기']
  if (code >= 61 && code <= 67) return ['🌧', '비']
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['🌨', '눈']
  if (code >= 95 && code <= 99) return ['⛈', '뇌우']
  return ['☁️', '흐림']
}
export const weatherIcon = (code: number) => kind(code)[0]
export const weatherWord = (code: number) => kind(code)[1]

/** 소수점 1자리(약 10km): 가까운 곳끼리 같은 날씨 요청을 나눠 씀 */
export const roundLoc = (l: Loc): Loc => ({ lat: Math.round(l.lat * 10) / 10, lng: Math.round(l.lng * 10) / 10 })

const pad = (n: number) => String(n).padStart(2, '0')
function yearsBack(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const dd = m === 2 && d === 29 ? 28 : d // 2/29 → 2/28
  return `${y - n}-${pad(m)}-${pad(dd)}`
}
function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

const ARCHIVE_LAG_DAYS = 8 // 과거 기록은 며칠 늦게 채워짐 → 이보다 최근 날짜는 아직 빈칸일 수 있음

/**
 * 예보 밖 날짜에 보여줄 과거 날짜. 이미 지나서 기록이 채워진 날이면 그날 자체(past = null, 실제 날씨).
 * 아니면 1년 전 같은 날. 아직 기록이 없을 만큼 최근이면 2년 전.
 * 2년 전도 아직이면(2년보다 먼 여행) null → 미래 날짜를 묻지 않음.
 */
export function pastDate(day: string, today: string): { date: string; past: Past | null } | null {
  const latest = addDays(today, -ARCHIVE_LAG_DAYS)
  if (day <= latest) return { date: day, past: null }
  const last = yearsBack(day, 1)
  if (last <= latest) return { date: last, past: '작년' }
  const before = yearsBack(day, 2)
  return before <= latest ? { date: before, past: '재작년' } : null
}

/** 날짜별 날씨 위치: 그날 처음 나오는 장소 있는 일정 → 없으면 여행지 위치 → 둘 다 없으면 빠짐 (반올림) */
export function dayLocations(days: string[], byDay: Record<string, Item[]>, fallback: Loc | null): Record<string, Loc> {
  const out: Record<string, Loc> = {}
  for (const day of days) {
    const it = (byDay[day] ?? []).find((i) => i.lat !== null && i.lng !== null)
    const loc = it ? { lat: it.lat!, lng: it.lng! } : fallback
    if (loc) out[day] = roundLoc(loc)
  }
  return out
}

const temps = (w: DayWeather, unit: string) => `${Math.round(w.min)}${unit}/${Math.round(w.max)}${unit}` // 최저/최고

/** 탭에 보이는 글: ☀️ 4°/12° ☔70% · 작년 ⛅ 3°/11° */
export function weatherText(w: TabWeather): string {
  const base = `${weatherIcon(w.code)} ${temps(w, '°')}`
  if (w.past) return `${w.past} ${base}`
  return w.rain !== null && w.rain >= RAIN_SHOW ? `${base} ☔${w.rain}%` : base
}

/** 화면 읽기용: 맑음 4도/12도 · 작년 이맘때 구름 조금 3도/11도 */
export function weatherSpeech(w: TabWeather): string {
  const base = `${weatherWord(w.code)} ${temps(w, '도')}`
  if (w.past) return `${w.past} 이맘때 ${base}`
  return w.rain !== null && w.rain >= RAIN_SHOW ? `${base}, 비 올 확률 ${w.rain}%` : base
}
