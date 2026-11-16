import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { makeItem } from '../test-fixtures'
import type { DayWeather } from '../lib/weather'
import { useWeather, type WeatherApi } from './useWeather'

const NOW = new Date('2026-11-17T03:00:00Z')
const DAYS = ['2026-11-30', '2026-12-01', '2026-12-05'] // 마지막 날은 예보 밖
const at = (lat: number, lng: number) => makeItem({ lat, lng })
const W = (code: number, max = 10, min = 2, rain: number | null = null): DayWeather => ({ code, max, min, rain })

function api(over: Partial<WeatherApi> = {}): { [K in keyof WeatherApi]: ReturnType<typeof vi.fn> } & WeatherApi {
  return {
    forecast: vi.fn(async () => ({ '2026-11-30': W(0, 12.4, 3.6, 10), '2026-12-01': W(63, 9, 5, 70) })),
    history: vi.fn(async () => ({ '2025-12-05': W(2, 11, 3) })),
    geocode: vi.fn(async () => ({ lat: 34.69, lng: 135.5 })),
    ...over,
  } as never
}

describe('useWeather', () => {
  test('같은 위치 여러 날: 예보 1번, 과거 1번. 예보 있는 날은 예보, 없는 날은 작년', async () => {
    const a = api()
    const byDay = { '2026-11-30': [at(34.69, 135.5)], '2026-12-01': [at(34.7, 135.51)], '2026-12-05': [at(34.71, 135.49)] }
    const { result } = renderHook(() => useWeather(DAYS, byDay, '오사카', 'Asia/Tokyo', { api: a, now: NOW }))
    await waitFor(() => expect(Object.keys(result.current)).toHaveLength(3))
    expect(result.current['2026-11-30']).toEqual({ ...W(0, 12.4, 3.6, 10), past: null })
    expect(result.current['2026-12-05']).toEqual({ ...W(2, 11, 3), past: '작년' })
    expect(a.forecast).toHaveBeenCalledTimes(1)
    expect(a.forecast.mock.calls[0][0]).toEqual({ lat: 34.7, lng: 135.5 })
    expect(a.history).toHaveBeenCalledTimes(1)
    expect(a.history.mock.calls[0].slice(0, 3)).toEqual([{ lat: 34.7, lng: 135.5 }, '2025-12-05', '2025-12-05'])
    expect(a.geocode).not.toHaveBeenCalled() // 모든 날에 장소가 있으니 여행지 검색 안 함
  })

  test('장소 없는 날은 여행지 이름으로 찾은 위치', async () => {
    const a = api()
    const { result } = renderHook(() => useWeather(DAYS, {}, '오사카', 'Asia/Tokyo', { api: a, now: NOW }))
    await waitFor(() => expect(Object.keys(result.current)).toHaveLength(3))
    expect(a.geocode).toHaveBeenCalledWith('오사카')
    expect(a.forecast.mock.calls[0][0]).toEqual({ lat: 34.7, lng: 135.5 })
  })

  test('여행지 이름이 비었고 장소도 없으면 아무것도 안 물음', async () => {
    const a = api()
    const { result } = renderHook(() => useWeather(DAYS, {}, '  ', 'Asia/Tokyo', { api: a, now: NOW }))
    await new Promise((r) => setTimeout(r, 10))
    expect(a.geocode).not.toHaveBeenCalled()
    expect(a.forecast).not.toHaveBeenCalled()
    expect(result.current).toEqual({})
  })

  test('오프라인 첫 실행(전부 빈 값): 날씨 없음, 에러 없음', async () => {
    const a = api({ forecast: vi.fn(async () => ({})), history: vi.fn(async () => ({})), geocode: vi.fn(async () => null) })
    const { result } = renderHook(() => useWeather(DAYS, { '2026-11-30': [at(34.7, 135.5)] }, '오사카', 'Asia/Tokyo', { api: a, now: NOW }))
    await waitFor(() => expect(a.history).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current).toEqual({})
  })

  test('일정이 바뀌어도 위치 묶음이 같으면 다시 안 물음', async () => {
    const a = api()
    const first = { '2026-11-30': [at(34.69, 135.5)], '2026-12-01': [at(34.7, 135.5)], '2026-12-05': [at(34.7, 135.5)] }
    const { result, rerender } = renderHook(({ byDay }) => useWeather(DAYS, byDay, '오사카', 'Asia/Tokyo', { api: a, now: NOW }), {
      initialProps: { byDay: first },
    })
    await waitFor(() => expect(Object.keys(result.current)).toHaveLength(3))
    rerender({ byDay: { ...first, '2026-12-01': [makeItem({ place_name: '새 메모' }), at(34.71, 135.52)] } })
    await new Promise((r) => setTimeout(r, 10))
    expect(a.forecast).toHaveBeenCalledTimes(1)
  })
})
