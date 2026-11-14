// 비짓재팬(Visit Japan Web) 미리 준비: 두 사람의 입력 정보를 "이 폰에만" 저장한다.
// 여권 정보라서 서버(Supabase)로는 절대 보내지 않는다.
import { tripDays } from './dates'
import type { Item, Member, Trip } from './types'

export const FIELD_GROUPS = [
  {
    title: '여권',
    fields: [
      { key: 'passportNo', label: '여권번호' },
      { key: 'surname', label: '성 (영문)' },
      { key: 'givenName', label: '이름 (영문)' },
      { key: 'nationality', label: '국적' },
      { key: 'birthDate', label: '생년월일', type: 'date' },
      { key: 'sex', label: '성별' },
      { key: 'passportExpiry', label: '여권 만료일', type: 'date' },
    ],
  },
  {
    title: '입국 정보',
    fields: [
      { key: 'purpose', label: '방문 목적' },
      { key: 'stayDays', label: '체류 기간 (일)' },
      { key: 'flightNo', label: '항공편명' },
      { key: 'arrivalDate', label: '도착 날짜', type: 'date' },
      { key: 'arrivalAirport', label: '도착 공항' },
    ],
  },
  {
    title: '일본 내 주소',
    fields: [
      { key: 'hotelName', label: '숙소 이름' },
      { key: 'postalCode', label: '우편번호' },
      { key: 'address', label: '주소' },
      { key: 'phone', label: '전화번호' },
    ],
  },
] as const satisfies readonly { title: string; fields: readonly { key: string; label: string; type?: 'date' }[] }[]

type GroupField = (typeof FIELD_GROUPS)[number]['fields'][number]
export type FieldKey = GroupField['key'] | 'memo'
export type VjwPerson = Record<FieldKey, string>
export type VjwData = Record<Member, VjwPerson>

/** "○○과 같게"로 복사하는 묶음 (입국 정보 + 일본 내 주소) */
export const SHARED_KEYS: FieldKey[] = [...FIELD_GROUPS[1].fields, ...FIELD_GROUPS[2].fields].map((f) => f.key)

const KEY = 'vjw:v1'
const ALL_KEYS: FieldKey[] = [...FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.key)), 'memo']

export function emptyPerson(trip?: Trip): VjwPerson {
  const p = Object.fromEntries(ALL_KEYS.map((k) => [k, ''])) as VjwPerson
  p.nationality = '대한민국 (KOR)'
  p.purpose = '관광'
  if (trip) {
    p.stayDays = String(tripDays(trip.start_date, trip.end_date).length)
    p.arrivalDate = trip.start_date
  }
  return p
}

export function loadVjw(trip?: Trip, storage: Storage = globalThis.localStorage): VjwData {
  let saved: Partial<Record<Member, Partial<VjwPerson>>> = {}
  try {
    saved = JSON.parse(storage.getItem(KEY) ?? '{}') ?? {}
  } catch {
    // 깨졌으면 처음부터
  }
  const merge = (m: Member): VjwPerson => {
    const base = emptyPerson(trip)
    const s = saved[m]
    if (s && typeof s === 'object') {
      for (const k of ALL_KEYS) if (typeof s[k] === 'string') base[k] = s[k]
    }
    return base
  }
  return { a: merge('a'), b: merge('b') }
}

/** 저장. 저장소가 막혔으면 false */
export function saveVjw(data: VjwData, storage: Storage = globalThis.localStorage): boolean {
  try {
    storage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearVjw(storage: Storage = globalThis.localStorage): void {
  try {
    storage.removeItem(KEY)
  } catch {
    // 막혔으면 할 수 있는 게 없음
  }
}

/** 화면에서는 앞 4자만 보이게 (복사는 전체) */
export function maskPassport(no: string): string {
  return no.length <= 4 ? no : no.slice(0, 4) + '*'.repeat(no.length - 4)
}

const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))]

/** 항공편명 후보: 예약번호가 있는 일정 */
export const flightCandidates = (items: Item[]) => uniq(items.map((i) => i.booking_code.trim()))

/** 숙소 이름 후보: 일정 장소 이름 */
export const hotelCandidates = (items: Item[]) => uniq(items.map((i) => i.place_name.trim()))
