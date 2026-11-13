import { describe, expect, test, vi } from 'vitest'
import { memoryStorage } from '../test-utils'
import { decodePolyline, getLeg, transitDeparture } from './routes'

describe('decodePolyline', () => {
  test('구글 공식 예제', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')
    expect(pts).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ])
  })
  test('빈 문자열', () => expect(decodePolyline('')).toEqual([]))
})

describe('transitDeparture (대중교통 시간표는 가까운 미래만 있음)', () => {
  const now = new Date(2026, 10, 14, 12, 0) // 2026-11-14 토 12:00
  test('시간 없으면 지금 기준(undefined)', () => expect(transitDeparture('2026-11-16', null, now)).toBeUndefined())
  test('일주일 안의 미래면 그 시각 그대로', () => {
    expect(transitDeparture('2026-11-16', '09:30', now)).toBe(new Date(2026, 10, 16, 9, 30).toISOString())
  })
  test('먼 미래면 같은 요일·시각의 가장 가까운 날로', () => {
    // 2027-01-11은 월요일 → 다가오는 월요일 2026-11-16 09:30
    expect(transitDeparture('2027-01-11', '09:30', now)).toBe(new Date(2026, 10, 16, 9, 30).toISOString())
  })
  test('지난 시각이면 다음 주 같은 요일로', () => {
    // 2026-11-14(토) 08:00은 이미 지남 → 2026-11-21(토) 08:00
    expect(transitDeparture('2026-11-14', '08:00', now)).toBe(new Date(2026, 10, 21, 8, 0).toISOString())
  })
})

const A = { lat: 35.1, lng: 139.1 }
const B = { lat: 35.2, lng: 139.2 }

function okFetch() {
  return vi.fn(async () =>
    new Response(JSON.stringify({ routes: [{ duration: '720s', distanceMeters: 900, polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC' } }] }), { status: 200 }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>
}

describe('getLeg', () => {
  test('요청 형식과 결과', async () => {
    const fetcher = okFetch()
    const leg = await getLeg(A, B, 'walk', { apiKey: 'K', fetcher, storage: memoryStorage() })
    expect(leg).toEqual({ path: [{ lat: 38.5, lng: -120.2 }, { lat: 40.7, lng: -120.95 }], durationSec: 720, distanceM: 900 })
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes')
    const headers = init.headers as Record<string, string>
    expect(headers['X-Goog-Api-Key']).toBe('K')
    expect(headers['X-Goog-FieldMask']).toBe('routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline')
    expect(JSON.parse(init.body as string)).toEqual({
      origin: { location: { latLng: { latitude: 35.1, longitude: 139.1 } } },
      destination: { location: { latLng: { latitude: 35.2, longitude: 139.2 } } },
      travelMode: 'WALK',
      languageCode: 'ko',
    })
  })

  test('대중교통은 TRANSIT + 출발 시각', async () => {
    const fetcher = okFetch()
    await getLeg(A, B, 'transit', { apiKey: 'K', fetcher, storage: memoryStorage(), departureTime: '2026-11-16T00:30:00.000Z' })
    const body = JSON.parse((fetcher.mock.calls[0] as [string, RequestInit])[1].body as string)
    expect(body.travelMode).toBe('TRANSIT')
    expect(body.departureTime).toBe('2026-11-16T00:30:00.000Z')
  })

  test('같은 구간은 저장본을 쓰고 다시 요청하지 않음', async () => {
    const storage = memoryStorage()
    const fetcher = okFetch()
    await getLeg(A, B, 'walk', { apiKey: 'K', fetcher, storage })
    const again = await getLeg(A, B, 'walk', { apiKey: 'K', fetcher, storage })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(again?.durationSec).toBe(720)
  })

  test('경로 없음·실패면 null, 저장 안 함', async () => {
    const storage = memoryStorage()
    const empty = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch
    expect(await getLeg(A, B, 'transit', { apiKey: 'K', fetcher: empty, storage })).toBeNull()
    const denied = vi.fn(async () => new Response('{"error":{}}', { status: 403 })) as unknown as typeof fetch
    expect(await getLeg(A, B, 'walk', { apiKey: 'K', fetcher: denied, storage })).toBeNull()
    expect(storage.length).toBe(0)
  })
})
