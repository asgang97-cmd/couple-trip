// 가계부: 인터넷이 없어도 적을 수 있게 폰에 대기열로 두었다가, 연결되면 순서대로 올린다.
import { toKrw } from './money'
import type { Expense, Member } from './types'

export type QueueOp = { op: 'add'; expense: Expense } | { op: 'delete'; id: string }

const KEY = 'expense-queue:v1'

export function loadQueue(storage: Storage = globalThis.localStorage): QueueOp[] {
  try {
    const q = JSON.parse(storage.getItem(KEY) ?? '[]')
    return Array.isArray(q) ? q : []
  } catch {
    return []
  }
}

function saveQueue(q: QueueOp[], storage: Storage): void {
  try {
    if (q.length === 0) storage.removeItem(KEY)
    else storage.setItem(KEY, JSON.stringify(q))
  } catch {
    // 저장 공간이 막혔으면 할 수 있는 게 없음 (화면에는 남아 있음)
  }
}

/** 대기열에 넣기. 아직 안 올라간 추가를 지우면 둘 다 그냥 빠짐 */
export function enqueue(op: QueueOp, storage: Storage = globalThis.localStorage): void {
  const q = loadQueue(storage)
  if (op.op === 'delete') {
    const i = q.findIndex((o) => o.op === 'add' && o.expense.id === op.id)
    if (i >= 0) {
      q.splice(i, 1)
      saveQueue(q, storage)
      return
    }
  }
  q.push(op)
  saveQueue(q, storage)
}

export type ShownExpense = Expense & { pending: boolean }

/** 화면용: 서버 목록 + 아직 안 올라간 추가, 지우기 대기 중인 건 빼고 */
export function mergeWithQueue(server: Expense[], queue: QueueOp[]): ShownExpense[] {
  const deleted = new Set(queue.flatMap((o) => (o.op === 'delete' ? [o.id] : [])))
  const known = new Set(server.map((e) => e.id))
  return [
    ...server.filter((e) => !deleted.has(e.id)).map((e) => ({ ...e, pending: false })),
    ...queue.flatMap((o) => (o.op === 'add' && !known.has(o.expense.id) ? [{ ...o.expense, pending: true }] : [])),
  ]
}

const same = (a: QueueOp, b: QueueOp) =>
  a.op === b.op && (a.op === 'add' ? a.expense.id === (b as typeof a).expense.id : a.id === (b as typeof a).id)

/** 순서대로 올리기. 실패하면 거기서 멈추고 나머지는 다음에. 올리는 중 새로 적은 것도 지키기 */
export async function flushQueue(
  repo: { add: (e: Expense) => Promise<void>; remove: (id: string) => Promise<void> },
  storage: Storage = globalThis.localStorage,
): Promise<{ sent: number; left: number }> {
  let sent = 0
  for (let guard = 0; guard < 1000; guard++) {
    const first = loadQueue(storage)[0]
    if (!first) break
    try {
      if (first.op === 'add') await repo.add(first.expense)
      else await repo.remove(first.id)
    } catch {
      break
    }
    const q = loadQueue(storage)
    const i = q.findIndex((o) => same(o, first))
    if (i >= 0) q.splice(i, 1)
    saveQueue(q, storage)
    sent++
  }
  return { sent, left: loadQueue(storage).length }
}

export function newExpense(
  o: { tripId: string; day: string; amount: number; currency: string; paidBy: Member; memo: string },
  makeId: () => string = () => crypto.randomUUID(),
  now: () => string = () => new Date().toISOString(),
): Expense {
  return { id: makeId(), trip_id: o.tripId, day: o.day, amount: o.amount, currency: o.currency, paid_by: o.paidBy, memo: o.memo.trim(), created_at: now() }
}

/** 원화 합계와 사람별 낸 돈. 환율이 없어 못 바꾼 건수는 따로 */
export function sumExpenses(list: Expense[], rate: number | null): { total: number; byMember: Record<Member, number>; unconverted: number } {
  const byMember: Record<Member, number> = { a: 0, b: 0 }
  let total = 0
  let unconverted = 0
  for (const e of list) {
    const krw = toKrw(e.amount, e.currency, rate)
    if (krw === null) {
      unconverted++
      continue
    }
    total += krw
    byMember[e.paid_by] += krw
  }
  return { total, byMember, unconverted }
}
