import { useCallback, useEffect, useRef, useState } from 'react'
import {
  discardFailed as discardStored, enqueue, flushQueue, loadFailed, loadQueue, mergeWithQueue, type QueueOp,
} from '../lib/expenseQueue'
import type { Expense } from '../lib/types'

interface Deps {
  add: (e: Expense) => Promise<void> // 서버에 올리기
  remove: (id: string) => Promise<void>
  reload: () => Promise<void> // 올린 뒤 다시 불러오기
  storage?: Storage
}

const RETRY_MS = 30_000

/**
 * 가계부: 인터넷이 없어도 적고 지울 수 있다.
 * 폰의 대기열에 두고 화면엔 바로 반영, 온라인이면(지금, 인터넷이 돌아올 때, 앱으로 돌아올 때, 30초마다) 순서대로 올린다.
 * 서버가 계속 거절하는 것은 failed로 보여주고 버릴 수 있게.
 */
export function useExpenses(server: Expense[], offline: boolean, deps: Deps) {
  const ref = useRef(deps)
  const serverRef = useRef<Set<string>>(new Set()) // 최신 서버 목록 id (올린 뒤 정리용)
  useEffect(() => {
    ref.current = deps
    serverRef.current = new Set(server.map((e) => e.id))
  })
  const storage = deps.storage ?? globalThis.localStorage
  const [queue, setQueue] = useState<QueueOp[]>(() => loadQueue(storage))
  const [failedOps, setFailedOps] = useState<QueueOp[]>(() => loadFailed(storage))
  // 방금 올렸지만 서버 목록에 아직 반영 안 된 것 (깜빡임·불러오기 실패 대비)
  const [sent, setSent] = useState<QueueOp[]>([])
  const flushing = useRef(false)
  const again = useRef(false) // 올리는 중에 또 적으면, 끝나고 한 번 더

  const flush = useCallback(async () => {
    if (flushing.current) {
      again.current = true
      return
    }
    flushing.current = true
    try {
      do {
        again.current = false
        const d = ref.current
        const r = await flushQueue({ add: d.add, remove: d.remove }, storage)
        if (r.sent.length) {
          const ids = serverRef.current
          setSent((s) => [...s, ...r.sent].filter((o) => (o.op === 'add' ? !ids.has(o.expense.id) : ids.has(o.id))))
        }
        setQueue(loadQueue(storage))
        setFailedOps(loadFailed(storage))
        if (r.sent.length) await d.reload().catch(() => {})
      } while (again.current)
    } finally {
      flushing.current = false
    }
  }, [storage])

  // 서버 목록에 이미 반영된 것은 "방금 올린 것"에서 빼고 보여줌 (남은 것은 다음 올리기 때 정리)
  const serverIds = new Set(server.map((e) => e.id))
  const notYet = (o: QueueOp) => (o.op === 'add' ? !serverIds.has(o.expense.id) : serverIds.has(o.id))

  // 앱을 열 때·인터넷이 돌아올 때 남은 것 올리기
  useEffect(() => {
    if (!offline && loadQueue(storage).length > 0) void flush()
  }, [offline, flush, storage])

  // 남은 게 있으면: 인터넷 연결·앱으로 돌아옴·30초마다 다시 시도
  const waiting = queue.length
  useEffect(() => {
    if (waiting === 0) return
    const retry = () => {
      if (!offline && document.visibilityState !== 'hidden') void flush()
    }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', retry)
    const timer = setInterval(retry, RETRY_MS)
    return () => {
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', retry)
      clearInterval(timer)
    }
  }, [waiting, offline, flush])

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
  const discardFailed = useCallback(
    (id: string) => {
      discardStored(id, storage)
      setFailedOps(loadFailed(storage))
    },
    [storage],
  )

  const failed = failedOps.flatMap((o) => (o.op === 'add' ? [{ ...o.expense, pending: false }] : []))
  return { shown: mergeWithQueue(server, queue, sent.filter(notYet)), add, remove, waiting, failed, discardFailed }
}
