import { describe, expect, test } from 'vitest'
import { makeItem } from '../test-fixtures'
import { directionsUrl, itemsWithLocation } from './maps'

const A = makeItem({ place_name: 'A', lat: 35.1, lng: 139.1 })
const B = makeItem({ place_name: 'B', lat: 35.2, lng: 139.2, google_place_id: 'pB' })
const C = makeItem({ place_name: 'C', lat: 35.3, lng: 139.3 })
const NO = makeItem({ place_name: 'no-loc' })

const params = (url: string | null) => {
  expect(url).not.toBeNull()
  const u = new URL(url!)
  expect(u.origin + u.pathname).toBe('https://www.google.com/maps/dir/')
  return Object.fromEntries(u.searchParams)
}

describe('itemsWithLocation', () => {
  test('위치 있는 것만, 순서 유지', () => {
    expect(itemsWithLocation([A, NO, C]).map((i) => i.place_name)).toEqual(['A', 'C'])
  })
})

describe('directionsUrl', () => {
  test('위치 0개 → null', () => expect(directionsUrl([NO])).toBeNull())

  test('1개 → 현재 위치에서 그곳까지 (origin 없음)', () => {
    expect(params(directionsUrl([B]))).toEqual({
      api: '1', destination: '35.2,139.2', destination_place_id: 'pB', travelmode: 'transit',
    })
  })

  test('3개 → 처음=출발, 끝=도착, 가운데=경유, 위치 없는 항목은 건너뜀', () => {
    const p = params(directionsUrl([A, NO, B, C], 'walking'))
    expect(p).toEqual({
      api: '1', origin: '35.1,139.1', destination: '35.3,139.3', waypoints: '35.2,139.2', waypoint_place_ids: 'pB', travelmode: 'walking',
    })
  })

  test('대중교통은 경유지를 지원하지 않아서, 경유지가 있으면 이동수단을 구글맵에 맡김', () => {
    const p = params(directionsUrl([A, B, C], 'transit'))
    expect(p.travelmode).toBeUndefined()
    expect(p.waypoints).toBe('35.2,139.2')
  })

  test('경유지는 최대 9개 (구글맵 제한)', () => {
    const many = Array.from({ length: 13 }, (_, i) => makeItem({ lat: i, lng: i }))
    const p = params(directionsUrl(many, 'walking'))
    expect(p.waypoints.split('|')).toHaveLength(9)
    expect(p.destination).toBe('12,12')
  })

  test('place_id가 일부만 있으면 waypoint_place_ids는 생략 (개수 불일치 방지)', () => {
    const p = params(directionsUrl([A, B, makeItem({ lat: 1, lng: 1 }), C], 'walking'))
    expect(p.waypoint_place_ids).toBeUndefined()
  })
})
