import { useState, type FormEvent, type ReactNode } from 'react'
import { parseLocalDate } from '../lib/dates'
import { samePlaceItems } from '../lib/duplicates'
import { theme } from '../theme'
import { Icon } from './Icon'
import type { Item, ItemInput, Member, Trip } from '../lib/types'

const dayFmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })

interface Props {
  trip: Trip
  /** 여행 날짜 목록 (날짜 고르기 칸) */
  days: string[]
  /** 지금 보고 있는 날 (새 일정의 기본 날짜) */
  day: string
  member: Member
  nextSortOrder: number
  initial?: Item
  /** 여행 전체 일정 (같은 장소를 또 넣으면 알리기용). 없으면 비교 안 함 */
  allItems?: Item[]
  onSave: (input: ItemInput) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
  /** 장소 검색 칸을 그리는 함수. 장소를 고르면 onPick을 부른다. */
  renderPlaceSearch?: (onPick: (p: PickedPlace) => void) => ReactNode
}

export interface PickedPlace {
  name: string
  lat: number
  lng: number
  placeId: string
}

/** '1,200' → 1200, '' → null, 숫자가 아니면 NaN */
function parseCost(raw: string): number | null {
  const s = raw.replace(/,/g, '').trim()
  if (s === '') return null
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN
}

export function ItemForm({ trip, days, day, member, nextSortOrder, initial, allItems, onSave, onDelete, onClose, renderPlaceSearch }: Props) {
  const [location, setLocation] = useState(
    initial?.lat != null && initial?.lng != null
      ? { lat: initial.lat, lng: initial.lng, placeId: initial.google_place_id }
      : null,
  )
  const [itemDay, setItemDay] = useState(initial?.day ?? day)
  const [time, setTime] = useState(initial?.time ?? '')
  const [placeName, setPlaceName] = useState(initial?.place_name ?? '')
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [bookingCode, setBookingCode] = useState(initial?.booking_code ?? '')
  const [bookingUrl, setBookingUrl] = useState(initial?.booking_url ?? '')
  const [cost, setCost] = useState(initial?.cost_amount != null ? String(initial.cost_amount) : '')
  const [currency, setCurrency] = useState(initial?.cost_currency ?? trip.currency)
  const [busy, setBusy] = useState(false)

  const costValue = parseCost(cost)
  const costInvalid = Number.isNaN(costValue)
  const canSave = placeName.trim() !== '' && !costInvalid && !busy

  /** 같은 장소가 이미 있으면 확인 창 (막지 않음). 수정할 땐 장소를 바꿨을 때만. false = 취소 */
  function confirmDuplicate(): boolean {
    const placeId = location?.placeId ?? null
    const changed = !initial || placeName.trim() !== initial.place_name || placeId !== initial.google_place_id
    if (!changed) return true
    const dups = samePlaceItems({ id: initial?.id, place_name: placeName, google_place_id: placeId }, allItems ?? [])
    if (dups.length === 0) return true
    const lines = dups.slice(0, 3).map((i) => {
      const n = days.indexOf(i.day)
      const when = [n >= 0 ? `${n + 1}일차` : '', dayFmt.format(parseLocalDate(i.day)), i.time ?? ''].filter(Boolean).join(' ')
      return `· ${when} ${i.place_name} (${theme.names[i.created_by]})`
    })
    return confirm(['이미 넣은 장소예요', ...lines, '그래도 저장할까요?'].join('\n'))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    if (!confirmDuplicate()) return
    setBusy(true)
    try {
      await onSave({
        ...(initial ? { id: initial.id } : {}),
        trip_id: trip.id,
        day: itemDay,
        time: time || null,
        place_name: placeName.trim(),
        memo: memo.trim(),
        booking_code: bookingCode.trim(),
        booking_url: bookingUrl.trim(),
        cost_amount: costValue,
        cost_currency: currency,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        google_place_id: location?.placeId ?? null,
        created_by: initial?.created_by ?? member,
        sort_order: initial?.sort_order ?? nextSortOrder,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet stack" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{initial ? '일정 수정' : '일정 추가'}</h2>
          <button type="button" className="ghost" onClick={onClose}>닫기</button>
        </div>

        {renderPlaceSearch?.((p) => {
          setLocation({ lat: p.lat, lng: p.lng, placeId: p.placeId })
          setPlaceName((cur) => (cur.trim() ? cur : p.name))
        })}
        {location && (
          <div className="location-chip">
            <span className="with-icon"><Icon name="pin" size={16} />지도에 표시돼요</span>
            <button type="button" className="ghost" onClick={() => setLocation(null)}>위치 지우기</button>
          </div>
        )}
        <label htmlFor="f-place">장소</label>
        <input id="f-place" value={placeName} onChange={(e) => setPlaceName(e.target.value)} maxLength={200} placeholder="예: 센소지" />

        <label htmlFor="f-day">날짜</label>
        <select id="f-day" value={itemDay} onChange={(e) => setItemDay(e.target.value)}>
          {/* 여행 기간이 줄어 원래 날짜가 목록에 없어도 그대로 고를 수 있게 */}
          {(days.includes(itemDay) ? days : [itemDay, ...days]).map((d) => {
            const n = days.indexOf(d)
            return <option key={d} value={d}>{n >= 0 ? `${n + 1}일차, ` : ''}{dayFmt.format(parseLocalDate(d))}</option>
          })}
        </select>

        <label htmlFor="f-time">시간</label>
        <input id="f-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />

        <label htmlFor="f-memo">메모</label>
        <textarea id="f-memo" rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />

        <label htmlFor="f-cost">예상 비용</label>
        <div className="row">
          <input id="f-cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
          <select aria-label="통화" value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: 110 }}>
            {[...new Set([trip.currency, 'KRW'])].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {costInvalid && <p className="error">숫자만 입력해 주세요</p>}

        <label htmlFor="f-code">예약 번호</label>
        <input id="f-code" value={bookingCode} onChange={(e) => setBookingCode(e.target.value)} />

        <label htmlFor="f-url">예약 링크</label>
        <input id="f-url" type="url" inputMode="url" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://" />

        <button type="submit" disabled={!canSave}>저장</button>
        {onDelete && (
          <button type="button" className="danger" disabled={busy} onClick={() => void onDelete()}>삭제</button>
        )}
      </form>
    </div>
  )
}
