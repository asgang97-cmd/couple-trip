import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { loadQueue } from '../lib/expenseQueue'
import type { Expense } from '../lib/types'
import { memoryStorage } from '../test-utils'
import { useExpenses } from './useExpenses'

const E = (id: string): Expense => ({ id, trip_id: 't', day: '2027-01-10', amount: 100, currency: 'KRW', paid_by: 'a', memo: '', created_at: id })

function deps(o: { offline?: boolean; fail?: boolean } = {}) {
  return {
    storage: memoryStorage(),
    add: vi.fn(async () => { if (o.fail) throw new Error('offline') }),
    remove: vi.fn(async () => {}),
    reload: vi.fn(async () => {}),
  }
}

describe('useExpenses', () => {
  test('오프라인에서 적으면 바로 보이고 "대기 중", 올리지는 않음', async () => {
    const d = deps()
    const { result } = renderHook(() => useExpenses([], true, d))
    act(() => result.current.add(E('x')))
    expect(result.current.shown.map((e) => [e.id, e.pending])).toEqual([['x', true]])
    expect(d.add).not.toHaveBeenCalled()
    expect(loadQueue(d.storage)).toHaveLength(1)
  })

  test('인터넷이 돌아오면 올리고 다시 불러옴', async () => {
    const d = deps()
    const { result, rerender } = renderHook(({ offline }) => useExpenses([], offline, d), { initialProps: { offline: true } })
    act(() => result.current.add(E('x')))
    rerender({ offline: false })
    await waitFor(() => expect(d.add).toHaveBeenCalledWith(E('x')))
    await waitFor(() => expect(d.reload).toHaveBeenCalled())
    expect(loadQueue(d.storage)).toEqual([])
  })

  test('온라인에서 적으면 바로 올림', async () => {
    const d = deps()
    const { result } = renderHook(() => useExpenses([], false, d))
    act(() => result.current.add(E('y')))
    await waitFor(() => expect(d.add).toHaveBeenCalledWith(E('y')))
  })

  test('올리기 실패해도 화면엔 남고 대기열에 남음', async () => {
    const d = deps({ fail: true })
    const { result } = renderHook(() => useExpenses([], false, d))
    act(() => result.current.add(E('z')))
    await waitFor(() => expect(d.add).toHaveBeenCalled())
    expect(result.current.shown.map((e) => e.id)).toEqual(['z'])
    expect(loadQueue(d.storage)).toHaveLength(1)
  })

  test('지우기: 서버에 있는 건 지우기 대기, 화면에서는 바로 사라짐', async () => {
    const d = deps()
    const { result } = renderHook(() => useExpenses([E('s')], true, d))
    act(() => result.current.remove('s'))
    expect(result.current.shown).toEqual([])
    expect(loadQueue(d.storage)).toEqual([{ op: 'delete', id: 's' }])
  })

  test('앱을 다시 열었을 때 남아 있던 대기열을 올림', async () => {
    const d = deps()
    d.storage.setItem('expense-queue:v1', JSON.stringify([{ op: 'add', expense: E('old') }]))
    renderHook(() => useExpenses([], false, d))
    await waitFor(() => expect(d.add).toHaveBeenCalledWith(E('old')))
  })
})
