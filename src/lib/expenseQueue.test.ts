import { describe, expect, test, vi } from 'vitest'
import { memoryStorage } from '../test-utils'
import { enqueue, flushQueue, isPermanentError, loadFailed, loadQueue, mergeWithQueue, newExpense, sumExpenses } from './expenseQueue'
import type { Expense } from './types'

const E = (id: string, o: Partial<Expense> = {}): Expense => ({
  id, trip_id: 't', day: '2027-01-10', amount: 1000, currency: 'JPY', paid_by: 'a', memo: '', created_at: id, ...o,
})

describe('대기열: 오프라인에서 적은 것', () => {
  test('추가·지우기를 순서대로 쌓음', () => {
    const s = memoryStorage()
    enqueue({ op: 'add', expense: E('x') }, s)
    enqueue({ op: 'delete', id: 'y' }, s)
    expect(loadQueue(s)).toEqual([{ op: 'add', expense: E('x') }, { op: 'delete', id: 'y' }])
  })

  test('아직 안 올라간 추가를 지우면 대기열에서 그냥 빠짐', () => {
    const s = memoryStorage()
    enqueue({ op: 'add', expense: E('x') }, s)
    enqueue({ op: 'delete', id: 'x' }, s)
    expect(loadQueue(s)).toEqual([])
  })

  test('깨진 대기열은 빈 것으로', () => expect(loadQueue(memoryStorage({ 'expense-queue:v1': '{bad' }))).toEqual([]))

  test('화면용: 서버 목록 + 대기 중 추가, 대기 중 지우기는 빠짐, 대기 표시', () => {
    const view = mergeWithQueue([E('a'), E('b')], [{ op: 'add', expense: E('c') }, { op: 'delete', id: 'a' }])
    expect(view.map((e) => [e.id, e.pending])).toEqual([['b', false], ['c', true]])
  })

  test('이미 올라간 추가가 대기열에 남아 있어도 두 번 보이지 않음', () => {
    const view = mergeWithQueue([E('c')], [{ op: 'add', expense: E('c') }])
    expect(view).toHaveLength(1)
  })
})

describe('flushQueue: 연결되면 올리기', () => {
  test('순서대로 올리고 대기열 비움', async () => {
    const s = memoryStorage()
    enqueue({ op: 'add', expense: E('x') }, s)
    enqueue({ op: 'delete', id: 'y' }, s)
    const calls: string[] = []
    const repo = { add: vi.fn(async (e: Expense) => void calls.push('add ' + e.id)), remove: vi.fn(async (id: string) => void calls.push('del ' + id)) }
    expect(await flushQueue(repo, s)).toMatchObject({ left: 0, failed: 0 })
    expect(calls).toEqual(['add x', 'del y'])
    expect(loadQueue(s)).toEqual([])
  })

  test('중간에 실패하면 거기서 멈추고 남은 것은 그대로 (다음에 다시)', async () => {
    const s = memoryStorage()
    enqueue({ op: 'add', expense: E('x') }, s)
    enqueue({ op: 'add', expense: E('y') }, s)
    const repo = { add: vi.fn(async (e: Expense) => { if (e.id === 'y') throw new Error('offline') }), remove: vi.fn() }
    const r = await flushQueue(repo, s)
    expect(r.sent).toHaveLength(1)
    expect(r.left).toBe(1)
    expect(loadQueue(s)).toEqual([{ op: 'add', expense: E('y') }])
  })

  test('올리는 중에 새로 적은 것도 지워지지 않음', async () => {
    const s = memoryStorage()
    enqueue({ op: 'add', expense: E('x') }, s)
    const repo = {
      // 첫 번째를 올리는 동안 한 번만 새로 적음, 새 것은 그다음엔 실패(아직 오프라인)
      add: vi.fn(async (e: Expense) => {
        if (e.id === 'x') enqueue({ op: 'add', expense: E('late') }, s)
        else throw new Error('offline')
      }),
      remove: vi.fn(),
    }
    await flushQueue(repo, s)
    expect(loadQueue(s)).toEqual([{ op: 'add', expense: E('late') }])
  })
})

describe('newExpense', () => {
  test('폰에서 id를 만들어 둠 (두 번 올라가도 한 줄)', () => {
    const e = newExpense({ tripId: 't', day: '2027-01-10', amount: 500, currency: 'JPY', paidBy: 'b', memo: ' 라멘 ' }, () => 'id1', () => '2027-01-10T03:00:00.000Z')
    expect(e).toEqual({ id: 'id1', trip_id: 't', day: '2027-01-10', amount: 500, currency: 'JPY', paid_by: 'b', memo: '라멘', created_at: '2027-01-10T03:00:00.000Z' })
  })
})

describe('sumExpenses: 원화 합계와 사람별', () => {
  test('엔화는 환율로, 원화는 그대로', () => {
    const r = sumExpenses([E('1', { amount: 1000, paid_by: 'a' }), E('2', { amount: 5000, currency: 'KRW', paid_by: 'b' })], 9)
    expect(r).toEqual({ total: 14000, byMember: { a: 9000, b: 5000 }, unconverted: 0 })
  })
  test('환율이 없으면 원화만 합치고 못 바꾼 건수', () => {
    const r = sumExpenses([E('1'), E('2', { amount: 5000, currency: 'KRW', paid_by: 'b' })], null)
    expect(r).toEqual({ total: 5000, byMember: { a: 0, b: 5000 }, unconverted: 1 })
  })
})

describe('검토 후 안전장치', () => {
  test('올리는 중인 추가를 지우면 "지우기"가 대기열에 남아 서버에서도 지워짐', async () => {
    const s = memoryStorage()
    enqueue({ op: 'add', expense: E('x') }, s)
    const removed: string[] = []
    const repo = {
      add: vi.fn(async () => { enqueue({ op: 'delete', id: 'x' }, s) }), // 올리는 도중에 지움
      remove: vi.fn(async (id: string) => void removed.push(id)),
    }
    await flushQueue(repo, s)
    expect(removed).toEqual(['x'])
    expect(loadQueue(s)).toEqual([])
  })

  test('서버가 계속 거절하는 것(형식 오류·권한)은 실패 목록으로 빼고 다음 것은 계속 올림', async () => {
    const s = memoryStorage()
    enqueue({ op: 'add', expense: E('bad') }, s)
    enqueue({ op: 'add', expense: E('good') }, s)
    const sent: string[] = []
    const repo = {
      add: vi.fn(async (e: Expense) => {
        if (e.id === 'bad') throw Object.assign(new Error('violates check constraint'), { code: '23514' })
        sent.push(e.id)
      }),
      remove: vi.fn(),
    }
    const r = await flushQueue(repo, s)
    expect(sent).toEqual(['good'])
    expect(r.failed).toBe(1)
    expect(loadQueue(s)).toEqual([])
    expect(loadFailed(s).map((f) => f.op === 'add' && f.expense.id)).toEqual(['bad'])
  })

  test('인터넷 문제·표 없음은 잠깐 문제라 대기열에 남김', () => {
    expect(isPermanentError(new TypeError('Failed to fetch'))).toBe(false)
    expect(isPermanentError(Object.assign(new Error('x'), { code: 'PGRST205' }))).toBe(false)
    expect(isPermanentError(Object.assign(new Error('x'), { code: '23502' }))).toBe(true)
    expect(isPermanentError(Object.assign(new Error('x'), { code: '42501' }))).toBe(true)
  })

  test('올라간 지출은 서버 목록에 나타날 때까지 화면에 그대로 (대기 표시 없이)', () => {
    const view = mergeWithQueue([], [], [{ op: 'add', expense: E('sent') }])
    expect(view.map((e) => [e.id, e.pending])).toEqual([['sent', false]])
    const gone = mergeWithQueue([E('del')], [], [{ op: 'delete', id: 'del' }])
    expect(gone).toEqual([])
  })
})
