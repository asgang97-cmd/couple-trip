import { useState, type FormEvent } from 'react'
import { countHiddenItems, tripDays } from '../lib/dates'
import type { Item, Trip, TripInput } from '../lib/types'

interface Props {
  trip: Trip
  items: Item[] // 모든 일정 (기간을 줄이면 몇 개가 숨겨지는지 미리 알려주기용)
  /** 실패하면 throw (알림은 부르는 쪽에서). 입력값은 그대로 남는다. */
  onSave: (input: TripInput) => Promise<void>
  onClose: () => void
}

/** 여행 이름·여행지·기간 바꾸기 */
export function TripSettings({ trip, items, onSave, onClose }: Props) {
  const [title, setTitle] = useState(trip.title)
  const [destination, setDestination] = useState(trip.destination)
  const [start, setStart] = useState(trip.start_date)
  const [end, setEnd] = useState(trip.end_date)
  const [busy, setBusy] = useState(false)

  const datesFilled = start !== '' && end !== ''
  const datesWrong = datesFilled && end < start // 'YYYY-MM-DD'는 글자 비교 = 날짜 비교
  const datesOk = datesFilled && !datesWrong
  const dayCount = datesOk ? tripDays(start, end).length : 0
  const hidden = datesOk ? countHiddenItems(items, start, end) : 0
  const canSave = title.trim() !== '' && datesOk && !busy

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    try {
      await onSave({ title: title.trim(), destination: destination.trim(), start_date: start, end_date: end })
    } catch {
      // 부르는 쪽에서 알림. 입력값은 그대로 두고 다시 저장할 수 있게
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet stack" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>여행 설정</h2>
          <button type="button" className="ghost" onClick={onClose}>닫기</button>
        </div>

        <label htmlFor="t-title">여행 이름</label>
        <input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />

        <label htmlFor="t-dest">여행지</label>
        <input id="t-dest" value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={100} placeholder="예: 도쿄" />

        <label htmlFor="t-start">시작일</label>
        <input id="t-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />

        <label htmlFor="t-end">마지막 날</label>
        <input id="t-end" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />

        {datesOk && <p className="note">{dayCount}일 여행</p>}
        {datesWrong && <p className="error">마지막 날은 시작일과 같거나 뒤여야 해요</p>}
        {hidden > 0 && <p className="note">기간 밖 일정 {hidden}개가 숨겨져요 (지워지진 않아요)</p>}

        <button type="submit" disabled={!canSave}>저장</button>
      </form>
    </div>
  )
}
