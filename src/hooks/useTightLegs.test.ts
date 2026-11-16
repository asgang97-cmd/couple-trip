import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { makeItem } from '../test-fixtures'
import { transitDeparture, type LatLng, type Leg, type RouteMode } from '../lib/routes'
import type { Item } from '../lib/types'
import { useTightLegs, type LoadLeg } from './useTightLegs'

const NOW = new Date('2027-01-08T00:00:00Z')
const leg = (sec: number): Leg => ({ path: [], durationSec: sec, distanceM: 1000 })
const at = (time: string, lat = 34.7) => makeItem({ time, lat, lng: 135.5 })

/** 수단별로 정해진 시간을 돌려주는 가짜 경로 계산 */
function loader(walk: number | null, transit: number | null) {
  return vi.fn<LoadLeg>(async (_a: LatLng, _b: LatLng, mode: RouteMode) => {
    const s = mode === 'walk' ? walk : transit
    return s === null ? null : leg(s)
  })
}

function run(items: Item[], loadLeg: LoadLeg, apiKey = 'key') {
  return renderHook(({ items }) => useTightLegs(items, 'Asia/Tokyo', { apiKey, loadLeg, now: NOW }), { initialProps: { items } })
}

describe('useTightLegs', () => {
  test('빠른 쪽(대중교통 35분)으로도 20분 안에 못 가면 경고', async () => {
    const [a, b] = [at('11:00'), at('11:20', 34.8)]
    const { result } = run([a, b], loader(2520, 2100))
    await waitFor(() => expect(result.current).toEqual({ [a.id]: { gapSec: 1200, walkSec: 2520, transitSec: 2100 } }))
  })

  test('걸어서 10분이면 경고 없음', async () => {
    const load = loader(600, 2100)
    const { result } = run([at('11:00'), at('11:20', 34.8)], load)
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    expect(result.current).toEqual({})
  })

  test('대중교통을 못 구하면 도보만으로 판단', async () => {
    const [a, b] = [at('11:00'), at('11:20', 34.8)]
    const { result } = run([a, b], loader(2520, null))
    await waitFor(() => expect(result.current[a.id]).toEqual({ gapSec: 1200, walkSec: 2520, transitSec: null }))
  })

  test('둘 다 못 구하거나 계산이 에러 나도 경고 없음 (에러 없이)', async () => {
    const none = loader(null, null)
    const r1 = run([at('11:00'), at('11:20', 34.8)], none)
    await waitFor(() => expect(none).toHaveBeenCalledTimes(2))
    expect(r1.result.current).toEqual({})
    const boom = vi.fn<LoadLeg>(async () => {
      throw new Error('Failed to fetch')
    })
    const r2 = run([at('11:00'), at('11:20', 34.8)], boom)
    await waitFor(() => expect(boom).toHaveBeenCalledTimes(2))
    expect(r2.result.current).toEqual({})
  })

  test('대중교통은 앞 일정 시각에 출발, 도보는 출발 시각 없음', async () => {
    const a = at('11:00')
    const load = loader(2520, 2100)
    run([a, at('11:20', 34.8)], load)
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    const byMode = Object.fromEntries(load.mock.calls.map((c) => [c[2], c[3]]))
    expect(byMode.transit).toBe(transitDeparture(a.day, '11:00', NOW, 'Asia/Tokyo'))
    expect(byMode.walk).toBeUndefined()
  })

  test('API 키가 없으면 계산하지 않음', async () => {
    const load = loader(2520, 2100)
    const { result } = run([at('11:00'), at('11:20', 34.8)], load, '')
    await Promise.resolve()
    expect(load).not.toHaveBeenCalled()
    expect(result.current).toEqual({})
  })

  test('날짜를 빨리 바꾸면 이전 날짜 계산 결과가 섞이지 않음', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => (release = r))
    const [a, b] = [at('11:00'), at('11:20', 34.8)]
    // 이전 날짜(위도 34.x) 계산은 늦게, 새 날짜(35.x)는 바로 끝남
    const load = vi.fn<LoadLeg>(async (from: LatLng) => {
      if (from.lat < 35) await gate
      return leg(2100)
    })
    const { result, rerender } = run([a, b], load)
    const [c, d] = [at('15:00', 35.0), at('16:00', 35.1)] // 다른 날: 여유 있음
    rerender({ items: [c, d] })
    await waitFor(() => expect(load).toHaveBeenCalledTimes(4))
    release() // 이전 날짜 결과가 이제야 도착
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current[a.id]).toBeUndefined()
  })

  test('같은 장소라도 시간이 바뀌면 다시 판단 (여유 생기면 경고 사라짐)', async () => {
    const a = at('11:00')
    const b = at('11:20', 34.8)
    const { result, rerender } = run([a, b], loader(2520, 2100))
    await waitFor(() => expect(result.current[a.id]).toBeDefined())
    rerender({ items: [a, { ...b, time: '12:00' }] })
    await waitFor(() => expect(result.current).toEqual({}))
  })
})
