import { useEffect, useState, type FormEvent } from 'react'
import type { Item, Member, Trip } from '../lib/types'
import {
  clearVjw, FIELD_GROUPS, flightCandidates, hotelCandidates, loadVjw, maskPassport, saveVjw, SHARED_KEYS,
  type FieldKey, type VjwData, type VjwPerson,
} from '../lib/vjw'
import { theme } from '../theme'
import { Icon } from './Icon'

interface Props {
  trip: Trip
  items: Item[] // 항공편·숙소를 일정에서 고르기용
  onClose: () => void
  storage?: Storage // 테스트용
  clipboard?: { writeText: (s: string) => Promise<void> } // 테스트용
}

const MEMBERS: Member[] = ['a', 'b']
const other = (m: Member): Member => (m === 'a' ? 'b' : 'a')

/** 받침 있으면 '과', 없으면 '와' (밍석과 / 밍하와) */
function withGwa(name: string): string {
  const last = name.charCodeAt(name.length - 1)
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0
  return `${name}${hasBatchim ? '과' : '와'}`
}

const MEMO = { key: 'memo' as const, label: '메모' }

/** 비짓재팬 미리 준비: 보기 모드에서 칸마다 복사, 수정 모드에서 입력. 이 폰에만 저장. */
export function VisitJapanSheet({ trip, items, onClose, storage = globalThis.localStorage, clipboard = globalThis.navigator?.clipboard }: Props) {
  const [data, setData] = useState<VjwData>(() => loadVjw(trip, storage))
  const [who, setWho] = useState<Member>('a')
  const [draft, setDraft] = useState<VjwPerson | null>(null) // null = 보기 모드
  const [notice, setNotice] = useState('')

  // 알림은 2.5초 뒤 사라짐
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 2500)
    return () => clearTimeout(t)
  }, [notice])

  const person = data[who]
  const flights = flightCandidates(items)
  const hotels = hotelCandidates(items)

  function persist(next: VjwData): boolean {
    const ok = saveVjw(next, storage)
    setData(next)
    if (!ok) setNotice('이 폰에 저장하지 못했어요. 브라우저의 사생활 보호 모드를 끄고 다시 해 주세요')
    return ok
  }

  async function copy(label: string, value: string) {
    try {
      await clipboard.writeText(value)
      setNotice(`${label} 복사했어요`)
    } catch {
      setNotice('복사하지 못했어요. 글자를 길게 눌러 복사해 주세요')
    }
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    if (persist({ ...data, [who]: draft })) {
      setDraft(null)
      setNotice('저장했어요')
    }
  }

  function sameAs(from: Member) {
    const next: VjwPerson = { ...data[who] }
    for (const k of SHARED_KEYS) next[k] = data[from][k]
    if (persist({ ...data, [who]: next })) setNotice(`입국 정보와 주소를 ${withGwa(theme.names[from])} 같게 했어요`)
  }

  function wipe() {
    if (!confirm('이 폰에 저장한 비짓재팬 정보를 모두 지울까요?')) return
    clearVjw(storage)
    setData(loadVjw(trip, storage))
    setDraft(null)
    setNotice('지웠어요')
  }

  function switchTo(m: Member) {
    setWho(m)
    setDraft(null)
  }

  const set = (k: FieldKey, v: string) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  function viewRow(key: FieldKey, label: string) {
    const value = person[key]
    const shown = key === 'passportNo' ? maskPassport(value) : value
    return (
      <div className="vjw-row" key={key}>
        <dt>{label}</dt>
        <dd>
          <span className={value ? 'vjw-value' : 'vjw-value vjw-empty'}>{value ? shown : '비어 있음'}</span>
          {value && (
            <button type="button" className="vjw-copy" aria-label={`${label} 복사`} onClick={() => void copy(label, value)}>
              <Icon name="copy" size={18} />
              복사
            </button>
          )}
        </dd>
      </div>
    )
  }

  function editRow(key: FieldKey, label: string, type?: 'date') {
    if (!draft) return null
    const id = `vjw-${key}`
    const picks = key === 'flightNo' ? flights : key === 'hotelName' ? hotels : []
    return (
      <div className="vjw-field" key={key}>
        <label htmlFor={id}>{label}</label>
        {key === 'memo' ? (
          <textarea id={id} rows={3} value={draft.memo} onChange={(e) => set('memo', e.target.value)} />
        ) : (
          <input
            id={id}
            type={type ?? 'text'}
            value={draft[key]}
            autoComplete="off"
            inputMode={key === 'phone' || key === 'postalCode' || key === 'stayDays' ? 'numeric' : undefined}
            onChange={(e) => set(key, e.target.value)}
          />
        )}
        {picks.length > 0 && (
          <select aria-label={`${label} 일정에서 고르기`} value="" onChange={(e) => e.target.value && set(key, e.target.value)}>
            <option value="">일정에서 고르기</option>
            {picks.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>
    )
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet stack vjw" role="dialog" aria-label="비짓재팬 준비" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>비짓재팬 준비</h2>
          <button type="button" className="ghost" onClick={onClose}>닫기</button>
        </div>
        <p className="note">이 폰에만 저장돼요. 서버로 보내지 않아요.</p>

        <div className="view-toggle" role="group" aria-label="누구 정보">
          {MEMBERS.map((m) => (
            <button key={m} type="button" aria-pressed={who === m} onClick={() => switchTo(m)}>
              {theme.emoji[m]} {theme.names[m]}
            </button>
          ))}
        </div>

        {draft ? (
          <form className="stack vjw-form" onSubmit={save}>
            {FIELD_GROUPS.map((g) => (
              <section key={g.title} className="vjw-group">
                <h3>{g.title}</h3>
                {g.fields.map((f) => editRow(f.key, f.label, 'type' in f ? f.type : undefined))}
              </section>
            ))}
            <section className="vjw-group">
              <h3>메모</h3>
              {editRow(MEMO.key, MEMO.label)}
            </section>
            <button type="submit">저장</button>
            <button type="button" className="ghost" onClick={() => setDraft(null)}>취소</button>
          </form>
        ) : (
          <>
            {FIELD_GROUPS.map((g) => (
              <section key={g.title} className="vjw-group">
                <h3>{g.title}</h3>
                <dl>{g.fields.map((f) => viewRow(f.key, f.label))}</dl>
              </section>
            ))}
            <section className="vjw-group">
              <h3>메모</h3>
              <dl>{viewRow(MEMO.key, MEMO.label)}</dl>
            </section>
            <div className="vjw-actions">
              <button type="button" onClick={() => setDraft({ ...person })}>
                <Icon name="pencil" size={18} />
                수정
              </button>
              <button type="button" className="ghost" onClick={() => sameAs(other(who))}>
                {withGwa(theme.names[other(who)])} 같게
              </button>
            </div>
            <button type="button" className="danger" onClick={wipe}>이 폰에서 지우기</button>
          </>
        )}
        {/* 아래에 떠 있는 알림: 어디를 보고 있든 "복사했어요"가 보이게 */}
        <p role="status" className={notice ? "vjw-notice" : "vjw-notice visually-hidden"}>{notice}</p>
      </div>
    </div>
  )
}
