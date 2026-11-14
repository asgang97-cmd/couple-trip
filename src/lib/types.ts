export type Member = 'a' | 'b'

export interface Trip {
  id: string
  title: string
  destination: string
  start_date: string // 'YYYY-MM-DD'
  end_date: string // 'YYYY-MM-DD'
  currency: string // 여행 통화, 예: 'JPY'
  manual_rate: number | null // 현지통화 1단위 = 이 값(원)
  cover_path: string | null // Storage 'covers' 안의 커플 사진 파일 위치
  decor?: import('./decor').Decor | null // 꾸미기 사진들 (007 실행 전 데이터엔 칸 자체가 없음)
  timezone?: string | null // 여행지 시간대(예: 'Asia/Tokyo'). 없으면 기기 시간대 (003 실행 전 데이터엔 칸 자체가 없음)
}

/** 앱의 여행 설정에서 바꿀 수 있는 칸 */
export type TripInput = Pick<Trip, 'title' | 'destination' | 'start_date' | 'end_date'>

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

/** 준비물: owner = 누가 챙길지 ('both' = 같이) */
export interface PackingItem {
  id: string
  trip_id: string
  name: string
  owner: 'both' | Member
  checked: boolean
  created_at: string
}

/** 보관함의 예약 확인서·QR·바우처 */
export interface Voucher {
  id: string
  trip_id: string
  item_id: string | null // 연결된 일정
  day: string | null // 연결된 날짜 'YYYY-MM-DD'
  title: string
  kind: 'image' | 'pdf'
  path: string // 원본 파일 위치 (Storage 'vouchers')
  pages: string[] // PDF 페이지 그림 위치들
  size: number
  created_at: string
}

/** 가계부: 실제로 쓴 돈 */
export interface Expense {
  id: string // 폰에서 만든 id (오프라인에서 적고 나중에 올려도 한 줄)
  trip_id: string
  day: string // 'YYYY-MM-DD'
  amount: number
  currency: string // 'JPY', 'KRW' 등
  paid_by: Member // 낸 사람
  memo: string
  created_at: string
}

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
