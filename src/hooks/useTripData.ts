import { useCallback, useEffect, useRef, useState } from 'react'
import { loadSnapshot, saveSnapshot } from '../lib/offlineCache'
import * as realRepo from '../lib/repo'
import type { Comment, Heart, Item, Trip } from '../lib/types'

type RepoLike = Pick<typeof realRepo, 'fetchTrip' | 'listItems' | 'listHearts' | 'listComments' | 'subscribe'>

export interface TripData {
  status: 'loading' | 'ready' | 'error'
  trip: Trip | null
  items: Item[]
  hearts: Heart[]
  comments: Comment[]
  offline: boolean
  savedAt: string | null // 오프라인일 때 보여주는 데이터의 저장 시각
  reload: () => Promise<void>
}

/**
 * 여행 데이터를 불러오고, 상대가 무언가 바꾸면(실시간 알림) 전부 다시 불러온다.
 * 불러오기에 실패하면 마지막 저장본을 보여주고 offline=true (편집 막기).
 */
export function useTripData(deps: { repo?: RepoLike; storage?: Storage } = {}): TripData {
  const repoRef = useRef(deps.repo ?? realRepo)
  const storageRef = useRef(deps.storage ?? globalThis.localStorage)
  const [state, setState] = useState<Omit<TripData, 'reload'>>({
    status: 'loading', trip: null, items: [], hearts: [], comments: [], offline: false, savedAt: null,
  })
  // 요청 번호: 늦게 도착한 예전 응답이 새 응답을 덮어쓰지 않게
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const id = ++requestId.current
    const r = repoRef.current
    try {
      const trip = await r.fetchTrip()
      const [items, hearts, comments] = await Promise.all([
        r.listItems(trip.id), r.listHearts(trip.id), r.listComments(trip.id),
      ])
      if (id !== requestId.current) return
      const savedAt = new Date().toISOString()
      saveSnapshot({ trip, items, hearts, comments, savedAt }, storageRef.current)
      setState({ status: 'ready', trip, items, hearts, comments, offline: false, savedAt })
    } catch {
      if (id !== requestId.current) return
      setState((s) => {
        if (s.status === 'ready') return { ...s, offline: true } // 보던 화면 유지
        const snap = loadSnapshot(storageRef.current)
        if (snap) return { status: 'ready', ...snap, offline: true }
        return { ...s, status: 'error' }
      })
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // 기기의 인터넷 연결 상태 따라가기
  useEffect(() => {
    const goOffline = () => setState((s) => ({ ...s, offline: true }))
    const goOnline = () => void reload()
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [reload])

  const tripId = state.trip?.id
  useEffect(() => {
    if (!tripId) return
    return repoRef.current.subscribe(tripId, () => void reload())
  }, [tripId, reload])

  return { ...state, reload }
}
