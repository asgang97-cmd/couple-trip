// 실제 길 그리기: 구글 Routes API로 두 장소 사이 경로 계산 + 기기에 저장해 재사용
import { parseLocalDate } from './dates'

export type RouteMode = 'walk' | 'transit'
export interface LatLng { lat: number; lng: number }
export interface Leg { path: LatLng[]; durationSec: number; distanceM: number }

const WEEK_MS = 7 * 86_400_000

/** 이동 시간 표기: 35분 / 1시간 5분 / 2시간 (최소 1분) */
export function formatDuration(sec: number): string {
  const min = Math.max(1, Math.round(sec / 60))
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}시간 ${m}분` : `${h}시간`
}

/** 구글 인코딩 폴리라인 → 좌표 목록 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = []
  let i = 0
  let lat = 0
  let lng = 0
  const next = () => {
    let result = 0
    let shift = 0
    let b: number
    do {
      b = encoded.charCodeAt(i++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    return result & 1 ? ~(result >> 1) : result >> 1
  }
  while (i < encoded.length) {
    lat += next()
    lng += next()
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

/** timeZone 기준 벽시계 시각(y-m-d h:mi) → 실제 순간(ms). timeZone이 없으면 기기 시간대. */
function wallTimeToMs(day: string, h: number, mi: number, timeZone?: string | null): number {
  if (!timeZone) {
    const d = parseLocalDate(day)
    d.setHours(h, mi, 0, 0)
    return d.getTime()
  }
  const [y, m, d] = day.split('-').map(Number)
  const asUtc = Date.UTC(y, m - 1, d, h, mi)
  // 그 순간 여행지 시계가 몇 시를 가리키는지 보고 차이(시차)만큼 보정. 서머타임 경계 대비 두 번.
  let t = asUtc - offsetMs(asUtc, timeZone)
  t = asUtc - offsetMs(t, timeZone)
  return t
}

/** 그 순간 timeZone의 UTC와의 시차(ms) */
function offsetMs(at: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(new Date(at))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return wall - Math.floor(at / 60_000) * 60_000
}

/**
 * 대중교통 출발 시각. 시간표는 가까운 미래만 있어서,
 * 일정이 일주일 넘게 남았으면 "같은 요일·같은 시각"의 가장 가까운 날로 바꿔 계산한다.
 * timeZone: 여행지 시간대(예: 'Asia/Tokyo'). 없으면 기기 시간대 기준.
 */
export function transitDeparture(day: string, time: string | null, now: Date, timeZone?: string | null): string | undefined {
  if (!time) return undefined
  if (timeZone && !isValidTimeZone(timeZone)) timeZone = null // 이름이 잘못됐으면 기기 시간대로
  const [h, m] = time.split(':').map(Number)
  const target = wallTimeToMs(day, h, m, timeZone)
  const diff = target - now.getTime()
  if (diff > 0 && diff <= WEEK_MS) return new Date(target).toISOString()

  if (!timeZone) {
    // 기기 시간대: 달력으로 요일 맞추기 (서머타임이 있어도 벽시계 시각 유지)
    const t = parseLocalDate(day)
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
    d.setDate(d.getDate() + ((t.getDay() - d.getDay() + 7) % 7))
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7)
    return d.toISOString()
  }
  // 여행지 시간대: 여행지의 "오늘"부터 8일 안에서 같은 요일·시각의 첫 미래 시점 (서머타임이 바뀌어도 벽시계 시각 유지)
  const weekday = new Date(Date.UTC(...ymd(day))).getUTCDay()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  for (let k = 0; k <= 8; k++) {
    const [y, mo, d] = ymd(today)
    const cand = new Date(Date.UTC(y, mo, d + k))
    if (cand.getUTCDay() !== weekday) continue
    const t = wallTimeToMs(cand.toISOString().slice(0, 10), h, m, timeZone)
    if (t > now.getTime()) return new Date(t).toISOString()
  }
  return new Date(target).toISOString() // 여기 올 일은 없음
}

/** 'YYYY-MM-DD' → [년, 월(0부터), 일] */
function ymd(s: string): [number, number, number] {
  const [y, m, d] = s.split('-').map(Number)
  return [y, m - 1, d]
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

interface LegOptions {
  apiKey: string
  departureTime?: string
  fetcher?: typeof fetch
  storage?: Storage
}

/** 기기에 저장하는 경로 개수 상한 (넘으면 비우고 다시 쌓음) */
export const MAX_ROUTES = 200
const PREFIX = 'route:v2:'

/**
 * 대중교통 저장 이름에는 날짜 대신 "요일+시각"만 넣는다.
 * 먼 일정은 출발일이 매일 다음 주 같은 요일로 바뀌는데, 날짜를 넣으면 매일 새로 쌓이기 때문.
 */
function slotOf(dep?: string): string {
  if (!dep) return 'now'
  const d = new Date(dep)
  return `${d.getUTCDay()}T${d.getUTCHours()}:${d.getUTCMinutes()}`
}

const keyOf = (a: LatLng, b: LatLng, mode: RouteMode, dep?: string) =>
  `${PREFIX}${mode}:${a.lat},${a.lng}>${b.lat},${b.lng}${mode === 'transit' ? `@${slotOf(dep)}` : ''}`

function routeKeys(storage: Storage): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (k?.startsWith('route:') && k !== 'route:version') keys.push(k)
  }
  return keys
}

/** 지도 경로 저장본만 전부 지우기 (오프라인용 일정 저장 공간이 모자랄 때 등) */
export function clearRouteCache(storage: Storage = globalThis.localStorage): void {
  try {
    routeKeys(storage).forEach((k) => storage.removeItem(k))
  } catch {
    // 저장소가 막혔으면 할 수 있는 게 없음
  }
}

/** 저장본: 좌표 목록 대신 짧은 인코딩 문자열로 (용량 절약) */
interface StoredLeg { poly: string; durationSec: number; distanceM: number }

function saveLeg(storage: Storage, key: string, value: StoredLeg): void {
  const raw = JSON.stringify(value)
  try {
    if (routeKeys(storage).length >= MAX_ROUTES) clearRouteCache(storage)
    storage.setItem(key, raw)
  } catch {
    // 꽉 찼으면 경로 저장본을 비우고 한 번만 더 시도
    clearRouteCache(storage)
    try {
      storage.setItem(key, raw)
    } catch {
      // 그래도 안 되면 저장 없이 그리기만
    }
  }
}

/** 두 장소 사이 경로. 못 구하면 null (지도에는 점선 직선으로 표시) */
/** 예전 형식(v1) 저장본은 처음 한 번 정리 */
function dropOldRoutes(storage: Storage): void {
  try {
    if (storage.getItem('route:version') === PREFIX) return
    routeKeys(storage).filter((k) => !k.startsWith(PREFIX) && k !== 'route:version').forEach((k) => storage.removeItem(k))
    storage.setItem('route:version', PREFIX)
  } catch {
    // 다음에 다시
  }
}

export async function getLeg(a: LatLng, b: LatLng, mode: RouteMode, opts: LegOptions): Promise<Leg | null> {
  const { apiKey, departureTime, fetcher = globalThis.fetch, storage = globalThis.localStorage } = opts
  dropOldRoutes(storage)
  const key = keyOf(a, b, mode, departureTime)

  try {
    const cached = storage.getItem(key)
    if (cached) {
      const c = JSON.parse(cached) as StoredLeg
      if (typeof c.poly === 'string') return { path: decodePolyline(c.poly), durationSec: c.durationSec, distanceM: c.distanceM }
    }
  } catch {
    // 저장본이 없거나 깨졌으면 새로 계산
  }

  try {
    const res = await fetcher('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // 필요한 3가지만 받기 (요금 최소화)
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } },
        destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } },
        travelMode: mode === 'walk' ? 'WALK' : 'TRANSIT',
        ...(mode === 'transit' && departureTime ? { departureTime } : {}),
        languageCode: 'ko',
      }),
    })
    if (!res.ok) return null
    const route = (await res.json())?.routes?.[0]
    if (!route?.polyline?.encodedPolyline) return null
    const stored: StoredLeg = {
      poly: route.polyline.encodedPolyline,
      durationSec: parseInt(route.duration ?? '0', 10),
      distanceM: route.distanceMeters ?? 0,
    }
    saveLeg(storage, key, stored)
    return { path: decodePolyline(stored.poly), durationSec: stored.durationSec, distanceM: stored.distanceM }
  } catch {
    return null
  }
}
