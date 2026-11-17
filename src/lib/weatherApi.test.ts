import { describe, expect, test, vi } from 'vitest'
import { memoryStorage } from '../test-utils'
import { geocode, getForecast, getHistory } from './weatherApi'

const HOUR = 3_600_000
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const fetcherOf = (...responses: (Response | Error)[]) =>
  vi.fn(async (_url: string | URL | Request) => {
    const r = responses.shift()!
    if (r instanceof Error) throw r
    return r
  })
const OSAKA = { lat: 34.7, lng: 135.5 }
const forecastBody = {
  daily: {
    time: ['2027-01-12', '2027-01-13', '2027-01-14'],
    weather_code: [0, 63, null],
    temperature_2m_max: [12.4, 9.1, null],
    temperature_2m_min: [3.6, 5.2, null],
    precipitation_probability_max: [10, null, null],
  },
}

describe('getForecast', () => {
  test('16일 예보 요청, 날짜별로 (값이 비면 그 날 빠짐, 비 확률만 비면 null)', async () => {
    const fetcher = fetcherOf(ok(forecastBody))
    const r = await getForecast(OSAKA, { fetcher, storage: memoryStorage(), now: 0 })
    expect(String(fetcher.mock.calls[0][0])).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=34.7&longitude=135.5&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16&past_days=10',
    )
    expect(r).toEqual({
      '2027-01-12': { code: 0, max: 12.4, min: 3.6, rain: 10 },
      '2027-01-13': { code: 63, max: 9.1, min: 5.2, rain: null },
    })
  })

  test('3시간 안엔 저장본, 지나면 새로', async () => {
    const storage = memoryStorage()
    const fetcher = fetcherOf(ok(forecastBody), ok(forecastBody))
    await getForecast(OSAKA, { fetcher, storage, now: 0 })
    await getForecast(OSAKA, { fetcher, storage, now: 2.9 * HOUR })
    expect(fetcher).toHaveBeenCalledTimes(1)
    await getForecast(OSAKA, { fetcher, storage, now: 3.1 * HOUR })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  test('실패하면 기간 지난 저장본, 저장본도 없으면 빈 값 (에러 없음)', async () => {
    const storage = memoryStorage()
    const fetcher = fetcherOf(ok(forecastBody), new TypeError('Failed to fetch'), new Response('x', { status: 500 }))
    await getForecast(OSAKA, { fetcher, storage, now: 0 })
    expect(Object.keys(await getForecast(OSAKA, { fetcher, storage, now: 10 * HOUR }))).toHaveLength(2)
    expect(await getForecast({ lat: 1, lng: 2 }, { fetcher, storage, now: 0 })).toEqual({})
  })
})

describe('getHistory', () => {
  const body = { daily: { time: ['2026-01-12', '2026-01-13'], weather_code: [2, 3], temperature_2m_max: [11, 8], temperature_2m_min: [3, 1] } }
  test('과거 기록 범위 요청, 비 확률 없음, 한 번 받으면 계속 씀', async () => {
    const storage = memoryStorage()
    const fetcher = fetcherOf(ok(body))
    const r = await getHistory(OSAKA, '2026-01-12', '2026-01-13', { fetcher, storage, now: 0 })
    expect(String(fetcher.mock.calls[0][0])).toBe(
      'https://archive-api.open-meteo.com/v1/archive?latitude=34.7&longitude=135.5&start_date=2026-01-12&end_date=2026-01-13&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto',
    )
    expect(r['2026-01-12']).toEqual({ code: 2, max: 11, min: 3, rain: null })
    await getHistory(OSAKA, '2026-01-12', '2026-01-13', { fetcher, storage, now: 400 * 24 * HOUR })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('geocode', () => {
  test('여행지 이름 → 위치 (한국어 검색, 첫 결과)', async () => {
    const fetcher = fetcherOf(ok({ results: [{ latitude: 34.69, longitude: 135.5, name: '오사카' }] }))
    expect(await geocode('오사카', { fetcher, storage: memoryStorage() })).toEqual({ lat: 34.69, lng: 135.5 })
    expect(String(fetcher.mock.calls[0][0])).toBe(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent('오사카')}&count=1&language=ko`,
    )
  })
  test('결과 없음도 저장 → 다시 안 물음', async () => {
    const storage = memoryStorage()
    const fetcher = fetcherOf(ok({}))
    expect(await geocode('없는곳', { fetcher, storage })).toBeNull()
    expect(await geocode('없는곳', { fetcher, storage })).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  test('오프라인이면 null, 저장 안 함', async () => {
    const storage = memoryStorage()
    const fetcher = fetcherOf(new TypeError('Failed to fetch'), ok({ results: [{ latitude: 1, longitude: 2 }] }))
    expect(await geocode('오사카', { fetcher, storage })).toBeNull()
    expect(await geocode('오사카', { fetcher, storage })).toEqual({ lat: 1, lng: 2 })
  })
})

describe('getHistory 빈칸', () => {
  test('요청한 날짜가 빠진 응답(최근 기록 아직 없음)은 저장하지 않음 → 다음에 다시', async () => {
    const storage = memoryStorage()
    const partial = { daily: { time: ['2026-01-12', '2026-01-13'], weather_code: [2, null], temperature_2m_max: [11, null], temperature_2m_min: [3, null] } }
    const full = { daily: { time: ['2026-01-12', '2026-01-13'], weather_code: [2, 3], temperature_2m_max: [11, 8], temperature_2m_min: [3, 1] } }
    const fetcher = fetcherOf(ok(partial), ok(full))
    expect(Object.keys(await getHistory(OSAKA, '2026-01-12', '2026-01-13', { fetcher, storage, now: 0 }))).toEqual(['2026-01-12'])
    expect(Object.keys(await getHistory(OSAKA, '2026-01-12', '2026-01-13', { fetcher, storage, now: HOUR }))).toHaveLength(2)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
