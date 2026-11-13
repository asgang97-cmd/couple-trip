import type { Item, Trip } from './lib/types'

export const TRIP: Trip = {
  id: 'trip-1',
  title: '우리의 도쿄 여행',
  destination: '도쿄',
  start_date: '2027-01-10',
  end_date: '2027-01-14',
  currency: 'JPY',
  manual_rate: null,
}

let n = 0
export function makeItem(over: Partial<Item> = {}): Item {
  n++
  return {
    id: `item-${n}`,
    trip_id: TRIP.id,
    day: '2027-01-10',
    time: null,
    place_name: `장소 ${n}`,
    memo: '',
    booking_code: '',
    booking_url: '',
    cost_amount: null,
    cost_currency: 'JPY',
    lat: null,
    lng: null,
    google_place_id: null,
    created_by: 'a',
    sort_order: 0,
    created_at: '2026-11-14T00:00:00Z',
    updated_at: '2026-11-14T00:00:00Z',
    ...over,
  }
}
