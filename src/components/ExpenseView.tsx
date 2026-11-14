import { useState, type FormEvent } from 'react'
import { parseLocalDate } from '../lib/dates'
import { sumExpenses, type ShownExpense } from '../lib/expenseQueue'
import { formatMoney, toKrw } from '../lib/money'
import type { Member, Trip } from '../lib/types'
import { theme } from '../theme'
import { Icon } from './Icon'

export interface ExpenseInput {
  day: string
  amount: number
  currency: string
  paidBy: Member
  memo: string
}

interface Props {
  shown: ShownExpense[] // 서버 + 아직 안 올라간 것
  trip: Trip
  days: string[]
  defaultDay: string // 보고 있는 날
  member: Member // 나 (낸 사람 기본값)
  rate: number | null // 여행 통화 1단위 = 원
  waiting: number // 올리기 대기 건수
  offline: boolean
  loadError: boolean
  onAdd: (e: ExpenseInput) => void
  onRemove: (id: string) => void
  failed: ShownExpense[] // 서버가 거절해서 못 올린 것
  onDiscardFailed: (id: string) => void
}

const MEMBERS: Member[] = ['a', 'b']
const MAX_AMOUNT = 10_000_000_000 // 이보다 크면 잘못 적은 것
const fmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })

/** '1,500' → 1500, 숫자가 아니거나 0 이하면 null */
function parseAmount(raw: string): number | null {
  const s = raw.replace(/,/g, '').trim()
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT ? n : null
}

/** 가계부: 실제로 쓴 돈. 인터넷이 없어도 적을 수 있음 */
export function ExpenseView({
  shown, trip, days, defaultDay, member, rate, waiting, offline, loadError, onAdd, onRemove, failed, onDiscardFailed,
}: Props) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(trip.currency)
  const [paidBy, setPaidBy] = useState<Member>(member)
  const [day, setDay] = useState(days.includes(defaultDay) ? defaultDay : days[0])
  const [memo, setMemo] = useState('')

  const value = parseAmount(amount)
  const sum = sumExpenses(shown, rate)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (value === null) return
    onAdd({ day, amount: value, currency, paidBy, memo: memo.trim() })
    setAmount('')
    setMemo('')
  }

  function remove(x: ShownExpense) {
    if (confirm(`"${x.memo || formatMoney(x.amount, x.currency)}" 지출을 지울까요?`)) onRemove(x.id)
  }

  // 최근 날짜 먼저, 같은 날 안에서는 최근 기록 먼저
  const byDay = new Map<string, ShownExpense[]>()
  for (const x of [...shown].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))) {
    byDay.set(x.day, [...(byDay.get(x.day) ?? []), x])
  }
  const dayKeys = [...byDay.keys()].sort((a, b) => (a < b ? 1 : -1))
  const dayTitle = (d: string) => {
    const n = days.indexOf(d)
    return `${n >= 0 ? `${n + 1}일차, ` : ''}${fmt.format(parseLocalDate(d))}`
  }

  return (
    <section className="expenses" aria-label="가계부">
      <section className="expense-sum" aria-label="지출 합계">
        <div className="expense-total">
          <small>여행에서 쓴 돈</small>
          <strong>{formatMoney(sum.total, 'KRW')}</strong>
        </div>
        <dl className="expense-who">
          {MEMBERS.map((m) => (
            <div key={m}>
              <dt>{theme.emoji[m]} {theme.names[m]}</dt>
              <dd>{formatMoney(sum.byMember[m], 'KRW')}</dd>
            </div>
          ))}
        </dl>
        {sum.unconverted > 0 && <p className="note">환율을 못 불러와서 {sum.unconverted}건은 합계에서 빠졌어요</p>}
      </section>

      {loadError && <p className="error">가계부를 불러오지 못했어요. 보이는 목록이 최신이 아닐 수 있어요</p>}
      {failed.length > 0 && (
        <div className="expense-failed" role="alert">
          <p className="error">올리지 못한 지출이 {failed.length}건 있어요</p>
          <ul>
            {failed.map((x) => (
              <li key={x.id}>
                <span>{x.memo || '메모 없음'} {formatMoney(x.amount, x.currency)}</span>
                <button type="button" className="ghost" aria-label={`${x.memo || formatMoney(x.amount, x.currency)} 버리기`} onClick={() => onDiscardFailed(x.id)}>
                  버리기
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {waiting > 0 && (
        <p className="note expense-waiting" role="status">
          {offline ? `인터넷이 없어서 ${waiting}건은 폰에 있어요. 연결되면 자동으로 올라가요` : `${waiting}건 올리는 중…`}
        </p>
      )}

      <form className="expense-add" onSubmit={submit}>
        <div className="expense-row">
          <input aria-label="금액" inputMode="decimal" placeholder="금액" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select aria-label="통화" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {[...new Set([trip.currency, 'KRW'])].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="view-toggle expense-payer" role="group" aria-label="낸 사람">
          {MEMBERS.map((m) => (
            <button key={m} type="button" aria-pressed={paidBy === m} onClick={() => setPaidBy(m)}>
              {theme.emoji[m]} {theme.names[m]}
            </button>
          ))}
        </div>
        <div className="expense-row">
          <select aria-label="날짜" value={day} onChange={(e) => setDay(e.target.value)}>
            {days.map((d) => <option key={d} value={d}>{dayTitle(d)}</option>)}
          </select>
          <input aria-label="메모" placeholder="어디에 썼나요 (예: 라멘)" maxLength={200} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
        <button type="submit" disabled={value === null}>
          <Icon name="plus" size={18} />
          추가
        </button>
      </form>

      {shown.length === 0 ? (
        <p className="empty">아직 기록한 지출이 없어요</p>
      ) : (
        dayKeys.map((d) => (
          <section key={d} className="expense-day">
            <h3>{dayTitle(d)}</h3>
            <ul>
              {byDay.get(d)!.map((x) => {
                const krw = x.currency === 'KRW' ? null : toKrw(x.amount, x.currency, rate)
                return (
                  <li key={x.id} aria-label={x.memo || formatMoney(x.amount, x.currency)}>
                    <span className="expense-who-mark" aria-label={`낸 사람: ${theme.names[x.paid_by]}`}>{theme.emoji[x.paid_by]}</span>
                    <span className="expense-memo">{x.memo || '메모 없음'}</span>
                    {x.pending && <span className="expense-pending">올리기 대기</span>}
                    <span className="expense-amount">
                      {formatMoney(x.amount, x.currency)}
                      {krw !== null && <small>≈ {formatMoney(krw, 'KRW')}</small>}
                    </span>
                    <button type="button" className="expense-delete" aria-label={`${x.memo || formatMoney(x.amount, x.currency)} 지우기`} onClick={() => remove(x)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </section>
  )
}
