import { useEffect, useRef, useState } from 'react'
import { todayIn } from '../lib/hours'
import type { Item } from '../lib/types'
import { dayLocations, pastDate, roundLoc, type Loc, type Past, type TabWeather } from '../lib/weather'
import { geocode, getForecast, getHistory } from '../lib/weatherApi'
import { useNow } from './useNow'

export interface WeatherApi {
  forecast: (loc: Loc) => Promise<Awaited<ReturnType<typeof getForecast>>>
  history: (loc: Loc, start: string, end: string) => Promise<Awaited<ReturnType<typeof getHistory>>>
  geocode: (name: string) => Promise<Loc | null>
}
const DEFAULT_API: WeatherApi = { forecast: (l) => getForecast(l), history: (l, s, e) => getHistory(l, s, e), geocode: (n) => geocode(n) }
const NONE: Record<string, TabWeather> = {}

/**
 * 날짜별 날씨. 예보에 있는 날은 예보, 없는 날(약 2주보다 먼 날)은 작년(재작년) 같은 날 실제 날씨.
 * 위치 = 그날 처음 나오는 장소, 없으면 여행지 이름으로 찾은 곳. 같은 위치(약 10km)끼리 한 번만 물음.
 */
export function useWeather(
  days: string[],
  byDay: Record<string, Item[]>,
  destination: string,
  timeZone: string | null | undefined,
  opts: { api?: WeatherApi; now?: Date } = {},
): Record<string, TabWeather> {
  const clock = useNow()
  const today = todayIn(timeZone, opts.now ?? clock)
  const apiRef = useRef(opts.api ?? DEFAULT_API)
  useEffect(() => {
    apiRef.current = opts.api ?? DEFAULT_API
  })

  // 장소 없는 날이 있을 때만 여행지 이름으로 위치 찾기
  const name = destination.trim()
  const needsFallback = days.some((d) => !(byDay[d] ?? []).some((i) => i.lat !== null && i.lng !== null))
  const [found, setFound] = useState<{ name: string; loc: Loc | null } | null>(null)
  useEffect(() => {
    if (!needsFallback || !name) return
    let alive = true
    void apiRef.current.geocode(name).then(
      (loc) => alive && setFound({ name, loc }),
      () => alive && setFound({ name, loc: null }),
    )
    return () => {
      alive = false
    }
  }, [needsFallback, name])
  const fallback = found?.name === name && found.loc ? roundLoc(found.loc) : null

  // 다시 물을지는 날짜별 (반올림한) 위치 + 오늘로만 판단 → 일정 내용이 바뀌어도 위치가 같으면 그대로
  const locs = dayLocations(days, byDay, fallback)
  const key = Object.keys(locs).length ? JSON.stringify([today, locs]) : null
  const [done, setDone] = useState<{ key: string; weather: Record<string, TabWeather> } | null>(null)

  useEffect(() => {
    if (key === null) return
    let alive = true
    const [today, locs] = JSON.parse(key) as [string, Record<string, Loc>]
    const api = apiRef.current
    const groups = new Map<string, { loc: Loc; days: string[] }>()
    for (const [day, loc] of Object.entries(locs)) {
      const g = groups.get(`${loc.lat},${loc.lng}`) ?? { loc, days: [] }
      g.days.push(day)
      groups.set(`${loc.lat},${loc.lng}`, g)
    }
    void Promise.all(
      [...groups.values()].map(async ({ loc, days }) => {
        const out: Record<string, TabWeather> = {}
        const forecast = await api.forecast(loc).catch(() => ({}) as Awaited<ReturnType<WeatherApi['forecast']>>)
        // 예보 없는 날: 작년·재작년 묶음마다 따로 좁은 범위로 (섞어서 1년치를 묻지 않게)
        const buckets = new Map<Past, { day: string; date: string }[]>()
        for (const day of days) {
          if (forecast[day]) {
            out[day] = { ...forecast[day], past: null }
            continue
          }
          const p = pastDate(day, today)
          if (!p) continue // 2년보다 먼 날: 과거 기록도 아직 없음
          buckets.set(p.past, [...(buckets.get(p.past) ?? []), { day, date: p.date }])
        }
        await Promise.all(
          [...buckets].map(async ([past, rows]) => {
            const dates = rows.map((r) => r.date).sort()
            const history = await api.history(loc, dates[0], dates[dates.length - 1]).catch(() => ({}) as Awaited<ReturnType<WeatherApi['history']>>)
            for (const r of rows) if (history[r.date]) out[r.day] = { ...history[r.date], past }
          }),
        )
        return out
      }),
    ).then((parts) => {
      if (!alive) return // 그 사이 위치·날짜가 바뀜
      setDone({ key, weather: Object.assign({}, ...parts) })
    })
    return () => {
      alive = false
    }
  }, [key])

  return key !== null && done?.key === key ? done.weather : NONE
}
