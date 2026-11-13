import { useState, type FormEvent, type ReactNode } from 'react'
import type { Item, ItemInput, Member, Trip } from '../lib/types'

interface Props {
  trip: Trip
  day: string
  member: Member
  nextSortOrder: number
  initial?: Item
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

export function ItemForm({ trip, day, member, nextSortOrder, initial, onSave, onDelete, onClose, renderPlaceSearch }: Props) {
  const [location, setLocation] = useState(
    initial?.lat != null && initial?.lng != null
      ? { lat: initial.lat, lng: initial.lng, placeId: initial.google_place_id }
      : null,
  )
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

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    try {
      await onSave({
        ...(initial ? { id: initial.id } : {}),
        trip_id: trip.id,
        day: initial?.day ?? day,
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
            <span>📍 지도에 표시돼요</span>
            <button type="button" className="ghost" onClick={() => setLocation(null)}>위치 지우기</button>
          </div>
        )}
        <label htmlFor="f-place">장소</label>
        <input id="f-place" value={placeName} onChange={(e) => setPlaceName(e.target.value)} maxLength={200} placeholder="예: 센소지" />

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
