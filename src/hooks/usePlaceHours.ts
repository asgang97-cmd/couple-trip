import { useEffect, useRef, useState } from 'react'
import type { PlaceHours } from '../lib/hours'
import { getPlaceHours } from '../lib/placeHours'

export type LoadHours = (placeId: string) => Promise<PlaceHours | null>

const NONE: Record<string, PlaceHours> = {}

/**
 * 보이는 일정들의 장소 영업시간 (키 = 구글 장소 번호, 받은 것만).
 * 같은 장소는 한 번만 묻고, 받은 결과는 폰에 3일 저장(getPlaceHours).
 * 경고 판단은 부르는 쪽이 그릴 때마다 하므로 일정 시간을 바꾸면 바로 반영됨.
 */
export function usePlaceHours(placeIds: string[], opts: { apiKey?: string; loadHours?: LoadHours } = {}): Record<string, PlaceHours> {
  const { apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined, loadHours } = opts
  const [done, setDone] = useState<{ key: string; hours: Record<string, PlaceHours> } | null>(null)
  const ref = useRef(loadHours)
  useEffect(() => {
    ref.current = loadHours
  })

  const ids = [...new Set(placeIds)].sort()
  const key = apiKey && ids.length ? JSON.stringify(ids) : null

  useEffect(() => {
    if (key === null) return
    let alive = true
    const load: LoadHours = ref.current ?? ((id) => getPlaceHours(id, { apiKey: apiKey! }))
    const wanted = JSON.parse(key) as string[]
    void Promise.all(wanted.map((id) => load(id).then((h) => [id, h] as const, () => [id, null] as const))).then((pairs) => {
      if (!alive) return // 그 사이 날짜가 바뀜 → 이전 결과는 버림
      const hours: Record<string, PlaceHours> = {}
      for (const [id, h] of pairs) if (h) hours[id] = h
      setDone({ key, hours })
    })
    return () => {
      alive = false
    }
  }, [key, apiKey])

  return key !== null && done?.key === key ? done.hours : NONE
}
