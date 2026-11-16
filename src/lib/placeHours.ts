// 장소 영업시간을 구글(Places API New)에서 받아 폰에 3일 저장
import type { HoursPeriod, PlaceHours } from './hours'

const FRESH_MS = 3 * 86_400_000
const keyOf = (placeId: string) => `hours:v1:${placeId}`

interface Saved { savedAt: number; hours: PlaceHours }

function read(storage: Storage, placeId: string): Saved | null {
  try {
    const v = JSON.parse(storage.getItem(keyOf(placeId)) ?? 'null') as Saved | null
    return v && typeof v.savedAt === 'number' && v.hours ? v : null
  } catch {
    return null // 깨졌으면 새로 받기
  }
}

const periodsOf = (v: unknown): HoursPeriod[] | null => {
  const p = (v as { periods?: unknown } | undefined)?.periods
  return Array.isArray(p) ? (p as HoursPeriod[]) : null
}

/**
 * 영업시간. 3일 안에 받은 게 있으면 그대로, 아니면 새로 요청.
 * 못 받으면(오프라인·실패) 기간 지난 저장본이라도, 그것도 없으면 null.
 * 영업시간 정보가 없는 장소도 저장해서 같은 걸 계속 묻지 않음.
 */
export async function getPlaceHours(
  placeId: string,
  { apiKey, fetcher = globalThis.fetch, storage = globalThis.localStorage, now = Date.now() }: { apiKey: string; fetcher?: typeof fetch; storage?: Storage; now?: number },
): Promise<PlaceHours | null> {
  const saved = read(storage, placeId)
  if (saved && now - saved.savedAt < FRESH_MS) return saved.hours

  try {
    const res = await fetcher(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        // 필요한 2가지만 받기 (요금 최소화)
        'X-Goog-FieldMask': 'regularOpeningHours,currentOpeningHours',
      },
    })
    if (!res.ok) return saved?.hours ?? null // 권한 없음 등: 저장 안 함 → 다음에 다시
    const body = (await res.json()) as { regularOpeningHours?: unknown; currentOpeningHours?: unknown }
    const hours: PlaceHours = { regular: periodsOf(body.regularOpeningHours), current: periodsOf(body.currentOpeningHours) }
    try {
      storage.setItem(keyOf(placeId), JSON.stringify({ savedAt: now, hours } satisfies Saved))
    } catch {
      // 저장 못 해도 이번엔 씀
    }
    return hours
  } catch {
    return saved?.hours ?? null
  }
}
