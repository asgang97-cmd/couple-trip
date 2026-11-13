import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps'
import { useEffect, useRef } from 'react'
import type { PickedPlace } from './ItemForm'

interface Props {
  onPick: (p: PickedPlace) => void
  /** 이 근처 결과를 먼저 보여줌 (그날 첫 장소 등). 없으면 편향 없이 */
  near?: { lat: number; lng: number } | null
  apiKey?: string
}

type PlaceLike = {
  id: string
  displayName?: string | null
  location?: google.maps.LatLng | null
  fetchFields: (o: { fields: string[] }) => Promise<unknown>
}

function SearchBox({ onPick, near }: Omit<Props, 'apiKey'>) {
  const places = useMapsLibrary('places')
  const box = useRef<HTMLDivElement>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    if (!places || !box.current) return
    const el = new places.PlaceAutocompleteElement(
      near ? { locationBias: { center: near, radius: 50_000 } } : {},
    ) as unknown as HTMLElement
    el.setAttribute('placeholder', '장소 검색 (예: 센소지)')

    async function handle(place: PlaceLike) {
      // 필요한 정보 3가지만 요청 (요금 최소화)
      await place.fetchFields({ fields: ['displayName', 'location', 'id'] })
      if (!place.location) return
      onPickRef.current({
        name: place.displayName ?? '',
        lat: place.location.lat(),
        lng: place.location.lng(),
        placeId: place.id,
      })
    }

    // 구글 버전에 따라 이벤트 이름이 다름
    const onSelect = (e: Event) => {
      const ev = e as Event & { placePrediction?: { toPlace: () => PlaceLike }; place?: PlaceLike }
      const place = ev.placePrediction?.toPlace() ?? ev.place
      if (place) void handle(place)
    }
    el.addEventListener('gmp-select', onSelect)
    el.addEventListener('gmp-placeselect', onSelect)
    box.current.appendChild(el)
    return () => el.remove()
  }, [places, near])

  return <div ref={box} className="place-search" aria-label="장소 검색" />
}

export function PlaceSearch({ apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ...rest }: Props) {
  if (!apiKey) return null
  return (
    <APIProvider apiKey={apiKey} language="ko" region="KR">
      <SearchBox {...rest} />
    </APIProvider>
  )
}
