import { describe, expect, test, vi } from 'vitest'
import { memoryStorage } from '../test-utils'
import { getPlaceHours } from './placeHours'

const DAY = 86_400_000
const REG = [{ open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 21, minute: 0 } }]
const CUR = [{ open: { day: 2, hour: 11, minute: 0, date: { year: 2027, month: 1, day: 12 } }, close: { day: 2, hour: 21, minute: 0, date: { year: 2027, month: 1, day: 12 } } }]

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const fetcherOf = (...responses: (Response | Error)[]) =>
  vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const r = responses.shift()!
    if (r instanceof Error) throw r
    return r
  })

describe('getPlaceHours', () => {
  test('장소 번호로 영업시간 두 가지만 요청', async () => {
    const fetcher = fetcherOf(ok({ regularOpeningHours: { periods: REG }, currentOpeningHours: { periods: CUR } }))
    const h = await getPlaceHours('abc', { apiKey: 'key', fetcher, storage: memoryStorage(), now: 0 })
    expect(h).toEqual({ regular: REG, current: CUR, fetchedAt: 0 })
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('https://places.googleapis.com/v1/places/abc')
    expect(new Headers(init!.headers).get('X-Goog-Api-Key')).toBe('key')
    expect(new Headers(init!.headers).get('X-Goog-FieldMask')).toBe('regularOpeningHours,currentOpeningHours')
  })

  test('3일 안엔 폰에 저장한 걸 다시 씀, 지나면 새로 요청', async () => {
    const storage = memoryStorage()
    const body = { regularOpeningHours: { periods: REG } }
    const fetcher = fetcherOf(ok(body), ok(body))
    await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: 0 })
    expect(await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: 2.9 * DAY })).toMatchObject({ regular: REG, current: null })
    expect(fetcher).toHaveBeenCalledTimes(1)
    await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: 3.1 * DAY })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  test('영업시간 정보가 없는 장소도 저장 → 다시 묻지 않음', async () => {
    const storage = memoryStorage()
    const fetcher = fetcherOf(ok({}))
    expect(await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: 0 })).toMatchObject({ regular: null, current: null })
    expect(await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: DAY })).toMatchObject({ regular: null, current: null })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  test('403(키 권한 없음)은 null, 저장 안 함 → 다음에 다시 요청', async () => {
    const storage = memoryStorage()
    const fetcher = fetcherOf(new Response('denied', { status: 403 }), ok({ regularOpeningHours: { periods: REG } }))
    expect(await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: 0 })).toBeNull()
    expect(await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: 0 })).toMatchObject({ regular: REG, current: null })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  test('오프라인: 기간 지난 저장본이라도', async () => {
    const storage = memoryStorage()
    const fetcher = fetcherOf(ok({ regularOpeningHours: { periods: REG } }), new TypeError('Failed to fetch'))
    await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: 0 })
    expect(await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: 30 * DAY })).toMatchObject({ regular: REG, current: null })
  })

  test('오프라인이고 저장본도 없으면 null (에러 없음)', async () => {
    const fetcher = fetcherOf(new TypeError('Failed to fetch'))
    expect(await getPlaceHours('abc', { apiKey: 'key', fetcher, storage: memoryStorage(), now: 0 })).toBeNull()
  })

  test('저장본이 깨졌으면 새로 요청', async () => {
    const storage = memoryStorage({ 'hours:v1:abc': '{not json' })
    const fetcher = fetcherOf(ok({ regularOpeningHours: { periods: REG } }))
    expect(await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: 0 })).toMatchObject({ regular: REG, current: null })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('getPlaceHours 받은 날 기억', () => {
  test('저장본을 돌려줄 때도 받은 시각(fetchedAt)을 같이', async () => {
    const storage = memoryStorage()
    const fetcher = fetcherOf(ok({ regularOpeningHours: { periods: REG } }))
    expect(await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: 1000 })).toMatchObject({ fetchedAt: 1000 })
    expect(await getPlaceHours('abc', { apiKey: 'key', fetcher, storage, now: DAY })).toMatchObject({ fetchedAt: 1000 })
  })
})
