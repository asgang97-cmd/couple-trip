import { AdvancedMarker, APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import { useEffect, useMemo, useState } from 'react'
import { directionsUrl, itemsWithLocation } from '../lib/maps'
import { getLeg, transitDeparture, type LatLng, type Leg, type RouteMode } from '../lib/routes'
import type { Item } from '../lib/types'
import { theme } from '../theme'

type LoadLeg = (a: LatLng, b: LatLng, mode: RouteMode, departureTime: string | undefined) => Promise<Leg | null>

interface Props {
  items: Item[] // 그날 일정 (정렬된 순서 = 동선 순서)
  apiKey?: string
  mapId?: string
  loadLeg?: LoadLeg // 테스트에서 바꿔 끼우기용
  now?: Date
  timeZone?: string | null // 여행지 시간대 (대중교통 출발 시각 계산용)
}

type Located = ReturnType<typeof itemsWithLocation>[number]

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
const num = (i: number) => CIRCLED[i] ?? `(${i + 1})`

function formatDuration(sec: number): string {
  const min = Math.max(1, Math.round(sec / 60))
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}시간 ${m}분` : `${h}시간`
}
const formatDistance = (m: number) => (m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`)

/** 구간별 선 그리기(실제 길, 못 구하면 점선 직선) + 모든 핀이 보이게 화면 맞추기 */
function RouteLines({ points, legs }: { points: Located[]; legs: (Leg | null | undefined)[] }) {
  const map = useMap()

  useEffect(() => {
    if (!map || points.length === 0) return
    if (points.length === 1) {
      map.setCenter(points[0])
      map.setZoom(15)
    } else {
      const bounds = new google.maps.LatLngBounds()
      points.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, 48)
    }
  }, [map, points])

  useEffect(() => {
    if (!map) return
    const arrow = { path: google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 2.5, strokeOpacity: 1 }
    const lines = points.slice(0, -1).map((p, i) => {
      const leg = legs[i]
      const real = leg && leg.path.length > 1
      return new google.maps.Polyline({
        map,
        path: real ? leg.path : [p, points[i + 1]],
        strokeColor: theme.primary,
        strokeWeight: 5,
        strokeOpacity: real ? 0.85 : 0, // 직선은 점선으로
        icons: real
          ? [{ icon: arrow, offset: '60px', repeat: '140px' }]
          : [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.7, scale: 3 }, offset: '0', repeat: '14px' }],
      })
    })
    return () => lines.forEach((l) => l.setMap(null))
  }, [map, points, legs])

  return null
}

export function DayMap({
  items,
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  mapId = import.meta.env.VITE_GOOGLE_MAP_ID,
  loadLeg,
  now,
  timeZone,
}: Props) {
  const [mode, setMode] = useState<RouteMode>('walk')
  // 계산 결과 + 어떤 요청(장소·이동수단)에 대한 결과인지
  const [result, setResult] = useState<{ key: object; legs: (Leg | null)[] } | null>(null)

  // 좌표·시간이 바뀔 때만 다시 계산하도록 안정된 키로 묶기
  const located = itemsWithLocation(items)
  const signature = located.map((p) => `${p.id}:${p.lat},${p.lng}@${p.day} ${p.time ?? ''}`).join('|')
  const points = useMemo(() => located, [signature]) // eslint-disable-line react-hooks/exhaustive-deps -- signature가 located를 대표함

  // 요청이 바뀌면 새 객체 → 예전 결과는 자동으로 무시됨 (계산 중엔 undefined = 아직)
  const request = useMemo(() => ({ points, mode, timeZone }), [points, mode, timeZone])
  const canRoute = !!apiKey && points.length >= 2
  const legs: (Leg | null | undefined)[] = !canRoute
    ? []
    : result?.key === request ? result.legs : points.slice(0, -1).map(() => undefined)

  useEffect(() => {
    if (!apiKey || request.points.length < 2) return
    const { points, mode, timeZone } = request
    const load: LoadLeg = loadLeg ?? ((a, b, m, dep) => getLeg(a, b, m, { apiKey, departureTime: dep }))
    const at = now ?? new Date()
    let alive = true
    Promise.all(
      points.slice(0, -1).map((p, i) => {
        const dep = mode === 'transit' ? transitDeparture(p.day, p.time, at, timeZone) : undefined
        return load({ lat: p.lat, lng: p.lng }, { lat: points[i + 1].lat, lng: points[i + 1].lng }, mode, dep)
      }),
    ).then((r) => alive && setResult({ key: request, legs: r }))
    return () => {
      alive = false
    }
  }, [request, apiKey, loadLeg, now])

  if (!apiKey) return <p className="empty">지도를 쓰려면 구글맵 API 키가 필요해요</p>
  if (points.length === 0) return <p className="empty">일정에 장소를 검색해서 넣으면 지도에 보여요</p>

  const walk = directionsUrl(points, 'walking')!
  const transit = directionsUrl(points, 'transit')!
  const icon = mode === 'walk' ? '🚶' : '🚇'

  return (
    <section className="day-map">
      {points.length >= 2 && (
        <div className="view-toggle" role="group" aria-label="이동 수단">
          <button type="button" aria-pressed={mode === 'walk'} onClick={() => setMode('walk')}>🚶 도보</button>
          <button type="button" aria-pressed={mode === 'transit'} onClick={() => setMode('transit')}>🚇 대중교통</button>
        </div>
      )}
      <APIProvider apiKey={apiKey} language="ko" region="KR">
        <Map
          mapId={mapId || 'DEMO_MAP_ID'}
          defaultCenter={{ lat: points[0].lat, lng: points[0].lng }}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          className="map-box"
        >
          {points.map((p, i) => (
            <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }} title={p.place_name}>
              <span className="map-pin">{i + 1}</span>
            </AdvancedMarker>
          ))}
          <RouteLines points={points} legs={legs} />
        </Map>
      </APIProvider>
      {points.length >= 2 && (
        <ul className="leg-list">
          {points.slice(0, -1).map((p, i) => {
            const leg = legs[i]
            const label = `${num(i)} → ${num(i + 1)}`
            return (
              <li key={p.id}>
                {leg === undefined
                  ? `${label} 계산 중…`
                  : leg === null
                    ? `${label} 길을 못 찾아서 직선으로 표시`
                    : `${label} ${icon} ${formatDuration(leg.durationSec)} · ${formatDistance(leg.distanceM)}`}
              </li>
            )
          })}
        </ul>
      )}
      <div className="row map-links">
        <a className="btn-link" href={walk} target="_blank" rel="noopener noreferrer">🚶 걸어서 길찾기</a>
        <a className="btn-link" href={transit} target="_blank" rel="noopener noreferrer">🚇 대중교통 길찾기</a>
      </div>
    </section>
  )
}
