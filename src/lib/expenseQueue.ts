// 가계부: 인터넷이 없어도 적을 수 있게 폰에 대기열로 두었다가, 연결되면 순서대로 올린다.
import { toKrw } from './money'
import type { Expense, Member } from './types'

export type QueueOp = { op: 'add'; expense: Expense } | { op: 'delete'; id: string }

const KEY = 'expense-queue:v1'
const FAILED_KEY = 'expense-failed:v1' // 서버가 계속 거절한 것 (사용자에게 보여주고 버리게)
const INFLIGHT_KEY = 'expense-inflight:v1' // 지금 올리는 중인 추가의 id

function read(key: string, storage: Storage): QueueOp[] {
  try {
    const q = JSON.parse(storage.getItem(key) ?? '[]')
    return Array.isArray(q) ? q : []
  } catch {
    return []
  }
}

function write(key: string, q: QueueOp[], storage: Storage): void {
  try {
    if (q.length === 0) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(q))
  } catch {
    // 저장 공간이 막혔으면 할 수 있는 게 없음 (화면에는 남아 있음)
  }
}

export const loadQueue = (storage: Storage = globalThis.localStorage) => read(KEY, storage)
export const loadFailed = (storage: Storage = globalThis.localStorage) => read(FAILED_KEY, storage)

/** 실패 목록에서 버리기 */
export function discardFailed(id: string, storage: Storage = globalThis.localStorage): void {
  write(FAILED_KEY, loadFailed(storage).filter((o) => (o.op === 'add' ? o.expense.id : o.id) !== id), storage)
}

function inFlight(storage: Storage): string | null {
  try {
    return storage.getItem(INFLIGHT_KEY)
  } catch {
    return null
  }
}

/** 대기열에 넣기. 아직 안 올라간 추가를 지우면 둘 다 그냥 빠짐 (지금 올리는 중이면 지우기를 남김) */
export function enqueue(op: QueueOp, storage: Storage = globalThis.localStorage): void {
  const q = loadQueue(storage)
  if (op.op === 'delete' && op.id !== inFlight(storage)) {
    const i = q.findIndex((o) => o.op === 'add' && o.expense.id === op.id)
    if (i >= 0) {
      q.splice(i, 1)
      write(KEY, q, storage)
      return
    }
  }
  q.push(op)
  write(KEY, q, storage)
}

export type ShownExpense = Expense & { pending: boolean }

/**
 * 화면용: 서버 목록 + 아직 안 올라간 추가(대기 표시) + 방금 올렸지만 서버 목록엔 아직 없는 추가,
 * 지우기 대기 중이거나 방금 지운 건 빼고
 */
export function mergeWithQueue(server: Expense[], queue: QueueOp[], sent: QueueOp[] = []): ShownExpense[] {
  const deleted = new Set([...queue, ...sent].flatMap((o) => (o.op === 'delete' ? [o.id] : [])))
  const known = new Set(server.map((e) => e.id))
  const extra = (ops: QueueOp[], pending: boolean) =>
    ops.flatMap((o) => {
      if (o.op !== 'add' || known.has(o.expense.id) || deleted.has(o.expense.id)) return []
      known.add(o.expense.id)
      return [{ ...o.expense, pending }]
    })
  return [
    ...server.filter((e) => !deleted.has(e.id)).map((e) => ({ ...e, pending: false })),
    ...extra(sent, false),
    ...extra(queue, true),
  ]
}

const same = (a: QueueOp, b: QueueOp) =>
  a.op === b.op && (a.op === 'add' ? a.expense.id === (b as typeof a).expense.id : a.id === (b as typeof a).id)

/** 서버가 계속 거절할 오류인가 (형식·제약 위반, 권한). 인터넷·일시 오류는 false */
export function isPermanentError(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code
  if (typeof code !== 'string') return false
  return code.startsWith('22') || code.startsWith('23') || code === '42501'
}

/**
 * 순서대로 올리기. 잠깐 문제(인터넷 등)면 거기서 멈추고 나머지는 다음에.
 * 서버가 계속 거절하는 것은 실패 목록으로 빼고 다음 것을 계속. 올리는 중 새로 적은 것도 지키기.
 */
export async function flushQueue(
  repo: { add: (e: Expense) => Promise<void>; remove: (id: string) => Promise<void> },
  storage: Storage = globalThis.localStorage,
): Promise<{ sent: QueueOp[]; left: number; failed: number }> {
  const sent: QueueOp[] = []
  let failed = 0
  for (let guard = 0; guard < 1000; guard++) {
    const first = loadQueue(storage)[0]
    if (!first) break
    let permanent = false
    try {
      if (first.op === 'add') {
        try {
          storage.setItem(INFLIGHT_KEY, first.expense.id)
        } catch {
          // 표시만 못 할 뿐
        }
        await repo.add(first.expense)
      } else {
        await repo.remove(first.id)
      }
    } catch (e) {
      if (!isPermanentError(e)) break
      permanent = true
    } finally {
      try {
        storage.removeItem(INFLIGHT_KEY)
      } catch {
        // 무시
      }
    }
    const q = loadQueue(storage)
    const i = q.findIndex((o) => same(o, first))
    if (i >= 0) q.splice(i, 1)
    write(KEY, q, storage)
    if (permanent) {
      write(FAILED_KEY, [...loadFailed(storage), first], storage)
      failed++
    } else {
      sent.push(first)
    }
  }
  return { sent, left: loadQueue(storage).length, failed }
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
