import { useCallback, useEffect, useRef, useState } from 'react'
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
  reload: () => Promise<void>
}

/** 여행 데이터를 불러오고, 상대가 무언가 바꾸면(실시간 알림) 전부 다시 불러온다. */
export function useTripData(deps: { repo?: RepoLike } = {}): TripData {
  const repo = deps.repo ?? realRepo
  const repoRef = useRef(repo)
  const [state, setState] = useState<Omit<TripData, 'reload'>>({
    status: 'loading', trip: null, items: [], hearts: [], comments: [], offline: false,
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
      setState({ status: 'ready', trip, items, hearts, comments, offline: false })
    } catch {
      if (id !== requestId.current) return
      setState((s) => ({ ...s, status: s.status === 'ready' ? 'ready' : 'error' }))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const tripId = state.trip?.id
  useEffect(() => {
    if (!tripId) return
    return repoRef.current.subscribe(tripId, () => void reload())
  }, [tripId, reload])

  return { ...state, reload }
}
