import { useEffect, useState, type FormEvent } from 'react'
import { parseLocalDate } from '../lib/dates'
import type { Item, Trip, Voucher } from '../lib/types'
import { checkFile, prepareUpload, titleOf, type Prepared } from '../lib/voucherFile'
import { suggestLink } from '../lib/voucherMatch'

export interface VoucherFields {
  title: string
  itemId: string | null
  day: string | null
  prepared?: Prepared // 새로 올릴 때만
}

type Mode = { kind: 'new'; file: File } | { kind: 'edit'; voucher: Voucher }

interface Props {
  mode: Mode
  trip: Trip
  items: Item[]
  days: string[]
  /** 일정 카드에서 올릴 때 그 일정 */
  presetItemId?: string | null
  onClose: () => void
  /** 실패하면 throw (알림은 부르는 쪽에서). 창과 입력은 그대로 */
  onSave: (f: VoucherFields) => Promise<void>
  onDelete?: () => Promise<void>
  prepare?: (file: File) => Promise<Prepared> // 테스트용
}

const dayFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' })
const tabFmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })
const itemLabel = (i: Item) => `${tabFmt.format(parseLocalDate(i.day))} ${i.time ?? ''} ${i.place_name}`.replace(/\s+/g, ' ')

/** 바우처 올리기·수정: 이름, 연결할 일정, 날짜 */
export function VoucherSheet({ mode, trip: _trip, items, days, presetItemId = null, onClose, onSave, onDelete, prepare = prepareUpload }: Props) {
  const isNew = mode.kind === 'new'
  const [title, setTitle] = useState(isNew ? titleOf(mode.file.name) : mode.voucher.title)
  const [itemId, setItemId] = useState<string | null>(isNew ? presetItemId : mode.voucher.item_id)
  const [day, setDay] = useState<string | null>(
    isNew ? (items.find((i) => i.id === presetItemId)?.day ?? null) : mode.voucher.day,
  )
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(isNew ? checkFile(mode.file) : null)
  const [busy, setBusy] = useState(false)

  // 새 파일: 준비(사진 줄이기·PDF 읽기) + 일정 추천
  const file = isNew ? mode.file : null
  useEffect(() => {
    if (!file || checkFile(file)) return
    let alive = true
    prepare(file).then(
      (p) => {
        if (!alive) return
        setPrepared(p)
        if (presetItemId) return // 일정 카드에서 올리면 그 일정 그대로
        if (p.kind === 'image') {
          setNote('사진은 글자를 못 읽어요. 일정이나 날짜를 골라 주세요')
          return
        }
        const s = suggestLink(p.text, items, days)
        if (s.reason === 'code') {
          const it = items.find((i) => i.id === s.itemId)
          setItemId(s.itemId)
          setDay(s.day)
          setNote(`PDF에서 예약번호 ${s.code} 확인, "${it?.place_name ?? ''}" 일정에 붙였어요`)
        } else if (s.reason === 'date') {
          setDay(s.day)
          setNote(`PDF에서 ${dayFmt.format(parseLocalDate(s.day))} 날짜를 찾았어요. 일정도 고를 수 있어요`)
        } else {
          setNote('PDF에서 예약번호나 여행 날짜를 못 찾았어요. 일정이나 날짜를 골라 주세요')
        }
      },
      () => alive && setProblem('이 파일을 열 수 없어요. 다른 파일로 해 주세요'),
    )
    return () => {
      alive = false
    }
  }, [file]) // eslint-disable-line react-hooks/exhaustive-deps -- 파일이 바뀔 때만 준비

  function pickItem(id: string) {
    const it = items.find((i) => i.id === id)
    setItemId(it ? it.id : null)
    if (it) setDay(it.day)
  }

  const ready = isNew ? prepared !== null : true
  const canSave = !problem && ready && title.trim() !== '' && !busy

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    try {
      await onSave({ title: title.trim(), itemId, day, ...(prepared ? { prepared } : {}) })
    } catch {
      // 부르는 쪽에서 알림. 입력 그대로
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!onDelete || !confirm(`"${title}" 바우처를 지울까요?`)) return
    setBusy(true)
    try {
      await onDelete()
    } catch {
      // 부르는 쪽에서 알림
    } finally {
      setBusy(false)
    }
  }

  const sortedItems = [...items].sort((a, b) => (a.day + (a.time ?? '99') < b.day + (b.time ?? '99') ? -1 : 1))

  return (
    <div className="sheet-backdrop" onClick={busy ? undefined : onClose}>
      <form className="sheet stack" aria-label={isNew ? '바우처 올리기' : '바우처 수정'} onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{isNew ? '바우처 올리기' : '바우처 수정'}</h2>
          <button type="button" className="ghost" onClick={onClose} disabled={busy}>닫기</button>
        </div>

        {problem ? (
          <p className="error">{problem}</p>
        ) : (
          <>
            {isNew && !prepared && <p className="note" role="status">파일 준비 중… (PDF는 글자를 읽어요)</p>}
            {note && <p className="note vault-note" role="status">{note}</p>}

            <label htmlFor="v-title">이름</label>
            <input id="v-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />

            <label htmlFor="v-item">일정</label>
            <select id="v-item" value={itemId ?? ''} onChange={(e) => pickItem(e.target.value)}>
              <option value="">일정 없이</option>
              {sortedItems.map((i) => <option key={i.id} value={i.id}>{itemLabel(i)}</option>)}
            </select>

            <label htmlFor="v-day">날짜</label>
            <select id="v-day" value={day ?? ''} onChange={(e) => setDay(e.target.value || null)}>
              <option value="">날짜 없음</option>
              {days.map((d, n) => <option key={d} value={d}>{`${n + 1}일차, ${tabFmt.format(parseLocalDate(d))}`}</option>)}
            </select>

            <button type="submit" disabled={!canSave}>{busy ? '저장 중…' : '저장'}</button>
            {!isNew && onDelete && (
              <button type="button" className="danger" onClick={() => void remove()} disabled={busy}>지우기</button>
            )}
          </>
        )}
      </form>
    </div>
  )
}
