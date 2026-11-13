export type Member = 'a' | 'b'

export interface Trip {
  id: string
  title: string
  destination: string
  start_date: string // 'YYYY-MM-DD'
  end_date: string // 'YYYY-MM-DD'
  currency: string // 여행 통화, 예: 'JPY'
  manual_rate: number | null // 현지통화 1단위 = 이 값(원)
}

export interface Item {
  id: string
  trip_id: string
  day: string // 'YYYY-MM-DD'
  time: string | null // 'HH:MM' 또는 시간 미정
  place_name: string
  memo: string
  booking_code: string
  booking_url: string
  cost_amount: number | null
  cost_currency: string
  lat: number | null
  lng: number | null
  google_place_id: string | null
  created_by: Member
  sort_order: number
  created_at: string
  updated_at: string
}

export type ItemInput = Omit<Item, 'id' | 'created_at' | 'updated_at'> & { id?: string }

export interface Heart {
  item_id: string
  member: Member
}

export interface Comment {
  id: string
  item_id: string
  member: Member
  body: string
  created_at: string
}
