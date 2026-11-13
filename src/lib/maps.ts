import type { Item } from './types'

export type TravelMode = 'transit' | 'walking' | 'driving'
type Located = Item & { lat: number; lng: number }

const MAX_WAYPOINTS = 9 // 구글맵 링크가 받아주는 경유지 최대 개수

export function itemsWithLocation(items: Item[]): Located[] {
  return items.filter((i): i is Located => i.lat !== null && i.lng !== null)
}

const coord = (i: Located) => `${i.lat},${i.lng}`

/**
 * 구글맵 앱/웹에서 길찾기를 여는 링크.
 * 1곳: 현재 위치 → 그곳. 여러 곳: 첫 장소 → (경유) → 마지막 장소.
 * https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function directionsUrl(items: Item[], mode: TravelMode = 'transit'): string | null {
  const locs = itemsWithLocation(items)
  if (locs.length === 0) return null

  const p = new URLSearchParams({ api: '1' })
  const dest = locs[locs.length - 1]

  if (locs.length >= 2) {
    const origin = locs[0]
    p.set('origin', coord(origin))
    if (origin.google_place_id) p.set('origin_place_id', origin.google_place_id)
  }
  p.set('destination', coord(dest))
  if (dest.google_place_id) p.set('destination_place_id', dest.google_place_id)

  const middle = locs.slice(1, -1).slice(0, MAX_WAYPOINTS)
  if (middle.length > 0) {
    p.set('waypoints', middle.map(coord).join('|'))
    if (middle.every((i) => i.google_place_id)) p.set('waypoint_place_ids', middle.map((i) => i.google_place_id).join('|'))
  }

  // 대중교통 길찾기는 경유지를 지원하지 않음 → 이동수단은 구글맵이 고르게
  if (!(mode === 'transit' && middle.length > 0)) p.set('travelmode', mode)

  return `https://www.google.com/maps/dir/?${p.toString()}`
}
