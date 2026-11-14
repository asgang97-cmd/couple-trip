import { useCallback, useEffect, useRef, useState } from 'react'
import { enqueue, flushQueue, loadQueue, mergeWithQueue, type QueueOp } from '../lib/expenseQueue'
import type { Expense } from '../lib/types'

interface Deps {
  add: (e: Expense) => Promise<void> // 서버에 올리기
  remove: (id: string) => Promise<void>
  reload: () => Promise<void> // 올린 뒤 다시 불러오기
  storage?: Storage
}

/**
 * 가계부: 인터넷이 없어도 적고 지울 수 있다.
 * 폰의 대기열에 두고 화면엔 바로 반영, 온라인이면(지금 또는 나중에) 순서대로 올린다.
 */
export function useExpenses(server: Expense[], offline: boolean, deps: Deps) {
  const ref = useRef(deps)
  useEffect(() => {
    ref.current = deps
  })
  const storage = deps.storage ?? globalThis.localStorage
  const [queue, setQueue] = useState<QueueOp[]>(() => loadQueue(storage))
  const flushing = useRef(false)
  const again = useRef(false) // 올리는 중에 또 적으면, 끝나고 한 번 더

  const flush = useCallback(async () => {
    if (flushing.current) {
      again.current = true
      return
    }
    flushing.current = true
    try {
      const d = ref.current
      const r = await flushQueue({ add: d.add, remove: d.remove }, storage)
      setQueue(loadQueue(storage))
      if (r.sent > 0) await d.reload()
    } finally {
      flushing.current = false
    }
    if (again.current) {
      again.current = false
      await flush()
    }
  }, [storage]) // eslint-disable-line react-hooks/exhaustive-deps -- 자기 자신을 다시 부름

  // 앱을 열 때·인터넷이 돌아올 때 남은 것 올리기
  useEffect(() => {
    if (!offline && loadQueue(storage).length > 0) void flush()
  }, [offline, flush, storage])

  const push = useCallback(
    (op: QueueOp) => {
      enqueue(op, storage)
      setQueue(loadQueue(storage))
      if (!offline) void flush()
    },
    [offline, flush, storage],
  )

  const add = useCallback((e: Expense) => push({ op: 'add', expense: e }), [push])
  const remove = useCallback((id: string) => push({ op: 'delete', id }), [push])

  return { shown: mergeWithQueue(server, queue), add, remove, waiting: queue.length }
}
