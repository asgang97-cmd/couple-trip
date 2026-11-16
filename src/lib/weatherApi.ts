// Open-Meteo(무료, 키 없음): 예보·과거 기록·지명 검색. 받은 건 폰에 저장
import type { DayWeather, Loc } from './weather'

interface Opts { fetcher?: typeof fetch; storage?: Storage; now?: number }
interface Saved<T> { savedAt: number; value: T }

const FORECAST_FRESH_MS = 3 * 3_600_000

function read<T>(storage: Storage, key: string): Saved<T> | null {
  try {
    const v = JSON.parse(storage.getItem(key) ?? 'null') as Saved<T> | null
    return v && typeof v.savedAt === 'number' && 'value' in v ? v : null
  } catch {
    return null
  }
}
function write<T>(storage: Storage, key: string, savedAt: number, value: T): void {
  try {
    storage.setItem(key, JSON.stringify({ savedAt, value } satisfies Saved<T>))
  } catch {
    // 저장 못 해도 이번엔 씀
  }
}

/**
 * 저장본이 신선하면 그대로(freshMs = Infinity면 한 번 받으면 계속), 아니면 새로 받아 저장.
 * 못 받으면 저장본(기간 지나도), 그것도 없으면 fallback. 절대 throw 안 함.
 */
async function cached<T>(
  key: string, url: string, parse: (body: unknown) => T, fallback: T, freshMs: number, o: Opts,
  keep: (value: T) => boolean = () => true, // false면 이번 값은 쓰되 저장 안 함 (다음에 다시)
): Promise<T> {
  const { fetcher = globalThis.fetch, storage = globalThis.localStorage, now = Date.now() } = o
  const saved = read<T>(storage, key)
  if (saved && now - saved.savedAt < freshMs) return saved.value
  try {
    const res = await fetcher(url)
    if (!res.ok) return saved ? saved.value : fallback
    const value = parse(await res.json())
    if (keep(value)) write(storage, key, now, value)
    return value
  } catch {
    return saved ? saved.value : fallback
  }
}

type Daily = Record<string, (number | null)[] | string[] | undefined>

/** daily 배열 → 날짜별 날씨. 날씨 코드·기온이 빈 날은 빠짐 */
function parseDaily(body: unknown, withRain: boolean): Record<string, DayWeather> {
  const d = ((body as { daily?: Daily } | null)?.daily ?? {}) as Daily
  const time = (d.time ?? []) as string[]
  const at = (k: string, i: number) => ((d[k] as (number | null)[] | undefined)?.[i] ?? null)
  const out: Record<string, DayWeather> = {}
  time.forEach((day, i) => {
    const code = at('weather_code', i)
    const max = at('temperature_2m_max', i)
    const min = at('temperature_2m_min', i)
    if (code === null || max === null || min === null) return
    out[day] = { code, max, min, rain: withRain ? at('precipitation_probability_max', i) : null }
  })
  return out
}

const at = (l: Loc) => `latitude=${l.lat}&longitude=${l.lng}`

/** 16일 예보 (3시간마다 새로) */
export function getForecast(loc: Loc, o: Opts = {}): Promise<Record<string, DayWeather>> {
  const url = `https://api.open-meteo.com/v1/forecast?${at(loc)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`
  return cached(`wx:f:${loc.lat},${loc.lng}`, url, (b) => parseDaily(b, true), {}, FORECAST_FRESH_MS, o)
}

/** 과거 실제 날씨 (바뀌지 않으니 한 번 받으면 계속. 단 요청한 날짜가 빠졌으면 아직 안 채워진 것 → 저장 안 함) */
export function getHistory(loc: Loc, start: string, end: string, o: Opts = {}): Promise<Record<string, DayWeather>> {
  const url = `https://archive-api.open-meteo.com/v1/archive?${at(loc)}&start_date=${start}&end_date=${end}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
  return cached(`wx:h:${loc.lat},${loc.lng}:${start}:${end}`, url, (b) => parseDaily(b, false), {}, Infinity, o, (v) => !!v[start] && !!v[end])
}

/** 여행지 이름 → 위치 (한국어 검색 첫 결과, 없음도 저장) */
export function geocode(name: string, o: Opts = {}): Promise<Loc | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=ko`
  const parse = (b: unknown): Loc | null => {
    const r = (b as { results?: { latitude?: number; longitude?: number }[] } | null)?.results?.[0]
    return r && typeof r.latitude === 'number' && typeof r.longitude === 'number' ? { lat: r.latitude, lng: r.longitude } : null
  }
  return cached(`wx:g:${name}`, url, parse, null, Infinity, o)
}
