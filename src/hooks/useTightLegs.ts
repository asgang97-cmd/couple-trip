import { useEffect, useRef, useState } from 'react'
import { getLeg, transitDeparture, type LatLng, type Leg, type RouteMode } from '../lib/routes'
import { fastestSec, isTight, tightPairs } from '../lib/tight'
import type { Item } from '../lib/types'

export interface TightWarning { gapSec: number; walkSec: number | null; transitSec: number | null }
export type LoadLeg = (a: LatLng, b: LatLng, mode: RouteMode, departureTime: string | undefined) => Promise<Leg | null>

const NONE: Record<string, TightWarning> = {}

interface Options { apiKey?: string; loadLeg?: LoadLeg; now?: Date }

/**
 * 보이는 일정 목록에서 이동조차 못 하는 쌍을 찾아 경고. 키 = 앞 일정 id (빠듯한 쌍만 들어 있음).
 * 도보·대중교통 둘 다 계산해 빠른 쪽 기준. 못 구한 수단은 빼고, 둘 다 못 구하면 경고 없음.
 * 경로는 지도 탭과 같은 getLeg라 폰에 저장된 계산을 다시 씀.
 */
export function useTightLegs(items: Item[], timeZone: string | null | undefined, opts: Options = {}): Record<string, TightWarning> {
  const { apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined, loadLeg, now } = opts
  const [warnings, setWarnings] = useState<Record<string, TightWarning>>({})
  const ref = useRef({ items, loadLeg, now })
  useEffect(() => {
    ref.current = { items, loadLeg, now }
  })

  // 비교할 쌍이 바뀔 때만(시간·장소·순서) 다시 계산
  const pairs = tightPairs(items)
  const key = apiKey
    ? JSON.stringify([timeZone ?? null, pairs.map((p) => [p.from.id, p.from.day, p.from.time, p.from.lat, p.from.lng, p.to.lat, p.to.lng, p.gapSec])])
    : null

  useEffect(() => {
    if (key === null) return
    let alive = true
    const { items, loadLeg, now = new Date() } = ref.current
    const load: LoadLeg = loadLeg ?? ((a, b, m, dep) => getLeg(a, b, m, { apiKey: apiKey!, departureTime: dep }))
    const safe = (a: LatLng, b: LatLng, m: RouteMode, dep: string | undefined) =>
      load(a, b, m, dep).then((l) => l?.durationSec ?? null, () => null)

    void Promise.all(
      tightPairs(items).map(async ({ from, to, gapSec }) => {
        const a = { lat: from.lat!, lng: from.lng! }
        const b = { lat: to.lat!, lng: to.lng! }
        const [walkSec, transitSec] = await Promise.all([
          safe(a, b, 'walk', undefined),
          safe(a, b, 'transit', transitDeparture(from.day, from.time, now, timeZone)),
        ])
        return isTight(gapSec, fastestSec(walkSec, transitSec)) ? ([from.id, { gapSec, walkSec, transitSec }] as const) : null
      }),
    ).then((found) => {
      if (!alive) return // 그 사이 날짜·일정이 바뀜 → 이전 결과는 버림
      const next: Record<string, TightWarning> = {}
      for (const f of found) if (f) next[f[0]] = f[1]
      setWarnings(next)
    })
    return () => {
      alive = false
    }
  }, [key, apiKey, timeZone])

  return key === null ? NONE : warnings // API 키가 없으면 계산도 경고도 없음
}
