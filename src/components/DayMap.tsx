import { AdvancedMarker, APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import { useEffect } from 'react'
import { directionsUrl, itemsWithLocation } from '../lib/maps'
import type { Item } from '../lib/types'
import { theme } from '../theme'

interface Props {
  items: Item[] // 그날 일정 (정렬된 순서 = 동선 순서)
  apiKey?: string
  mapId?: string
}

type Located = ReturnType<typeof itemsWithLocation>[number]

/** 핀을 순서대로 잇는 선 + 모든 핀이 보이게 화면 맞추기 */
function RouteAndFit({ points }: { points: Located[] }) {
  const map = useMap()
  useEffect(() => {
    if (!map || points.length === 0) return
    const path = points.map((p) => ({ lat: p.lat, lng: p.lng }))
    const line = new google.maps.Polyline({
      path,
      map,
      strokeColor: theme.primary,
      strokeOpacity: 0.9,
      strokeWeight: 4,
      icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 3 }, offset: '50%', repeat: '120px' }],
    })
    if (path.length === 1) {
      map.setCenter(path[0])
      map.setZoom(15)
    } else {
      const bounds = new google.maps.LatLngBounds()
      path.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, 48)
    }
    return () => line.setMap(null)
  }, [map, points])
  return null
}

export function DayMap({
  items,
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  mapId = import.meta.env.VITE_GOOGLE_MAP_ID,
}: Props) {
  const points = itemsWithLocation(items)

  if (!apiKey) return <p className="empty">지도를 쓰려면 구글맵 API 키가 필요해요</p>
  if (points.length === 0) return <p className="empty">일정에 장소를 검색해서 넣으면 지도에 보여요</p>

  const walk = directionsUrl(points, 'walking')!
  const transit = directionsUrl(points, 'transit')!

  return (
    <section className="day-map">
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
          <RouteAndFit points={points} />
        </Map>
      </APIProvider>
      <div className="row map-links">
        <a className="btn-link" href={walk} target="_blank" rel="noopener noreferrer">🚶 걸어서 길찾기</a>
        <a className="btn-link" href={transit} target="_blank" rel="noopener noreferrer">🚇 대중교통 길찾기</a>
      </div>
    </section>
  )
}
