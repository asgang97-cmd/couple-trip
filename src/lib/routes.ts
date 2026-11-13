// 실제 길 그리기: 구글 Routes API로 두 장소 사이 경로 계산 + 기기에 저장해 재사용
import { parseLocalDate } from './dates'

export type RouteMode = 'walk' | 'transit'
export interface LatLng { lat: number; lng: number }
export interface Leg { path: LatLng[]; durationSec: number; distanceM: number }

const WEEK_MS = 7 * 86_400_000

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

/**
 * 대중교통 출발 시각. 시간표는 가까운 미래만 있어서,
 * 일정이 일주일 넘게 남았으면 "같은 요일·같은 시각"의 가장 가까운 날로 바꿔 계산한다.
 */
export function transitDeparture(day: string, time: string | null, now: Date): string | undefined {
  if (!time) return undefined
  const [h, m] = time.split(':').map(Number)
  const target = parseLocalDate(day)
  target.setHours(h, m, 0, 0)
  const diff = target.getTime() - now.getTime()
  if (diff > 0 && diff <= WEEK_MS) return target.toISOString()

  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
  d.setDate(d.getDate() + ((target.getDay() - d.getDay() + 7) % 7))
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7)
  return d.toISOString()
}

interface LegOptions {
  apiKey: string
  departureTime?: string
  fetcher?: typeof fetch
  storage?: Storage
}

const keyOf = (a: LatLng, b: LatLng, mode: RouteMode, dep?: string) =>
  `route:v1:${mode}:${a.lat},${a.lng}>${b.lat},${b.lng}${mode === 'transit' ? `@${dep ?? 'now'}` : ''}`

/** 두 장소 사이 경로. 못 구하면 null (지도에는 점선 직선으로 표시) */
export async function getLeg(a: LatLng, b: LatLng, mode: RouteMode, opts: LegOptions): Promise<Leg | null> {
  const { apiKey, departureTime, fetcher = globalThis.fetch, storage = globalThis.localStorage } = opts
  const key = keyOf(a, b, mode, departureTime)

  try {
    const cached = storage.getItem(key)
    if (cached) return JSON.parse(cached) as Leg
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
    const leg: Leg = {
      path: decodePolyline(route.polyline.encodedPolyline),
      durationSec: parseInt(route.duration ?? '0', 10),
      distanceM: route.distanceMeters ?? 0,
    }
    try {
      storage.setItem(key, JSON.stringify(leg))
    } catch {
      // 저장 공간이 막혀도 그리기는 계속
    }
    return leg
  } catch {
    return null
  }
}
