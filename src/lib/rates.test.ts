import { describe, expect, test, vi } from 'vitest'
import { getRate } from './rates'

function memoryStorage(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init))
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  }
}

const NOW = new Date('2027-01-05T03:00:00Z')
const okFetch = (krw: number) =>
  vi.fn(async () => new Response(JSON.stringify({ base: 'JPY', rates: { KRW: krw } }), { status: 200 })) as unknown as typeof fetch
const failFetch = () => vi.fn(async () => { throw new TypeError('network') }) as unknown as typeof fetch

describe('getRate', () => {
  test('manualRate가 있으면 fetch 안 함', async () => {
    const fetcher = okFetch(9.2)
    const r = await getRate('JPY', { manualRate: 9.0, fetcher, storage: memoryStorage() })
    expect(r).toEqual({ rate: 9.0, source: 'manual', fetchedAt: null })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('KRW는 1', async () => {
    const fetcher = okFetch(1)
    expect(await getRate('KRW', { fetcher, storage: memoryStorage() })).toEqual({ rate: 1, source: 'identity', fetchedAt: null })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('실시간 성공 시 캐시 저장', async () => {
    const storage = memoryStorage()
    const fetcher = okFetch(9.2)
    const r = await getRate('JPY', { fetcher, storage, now: () => NOW })
    expect(r).toEqual({ rate: 9.2, source: 'live', fetchedAt: NOW.toISOString() })
    expect(fetcher).toHaveBeenCalledWith('https://api.frankfurter.dev/v1/latest?base=JPY&symbols=KRW')
    expect(JSON.parse(storage.getItem('rate:JPY')!)).toEqual({ rate: 9.2, fetchedAt: NOW.toISOString() })
  })

  test('fetch 실패 + 캐시 있음 → cached', async () => {
    const storage = memoryStorage({ 'rate:JPY': JSON.stringify({ rate: 9.1, fetchedAt: '2027-01-01T00:00:00.000Z' }) })
    expect(await getRate('JPY', { fetcher: failFetch(), storage })).toEqual({
      rate: 9.1, source: 'cached', fetchedAt: '2027-01-01T00:00:00.000Z',
    })
  })

  test('fetch 실패 + 캐시 없음 → none', async () => {
    expect(await getRate('JPY', { fetcher: failFetch(), storage: memoryStorage() })).toEqual({
      rate: null, source: 'none', fetchedAt: null,
    })
  })

  test('응답이 비정상(ok=false 또는 KRW 없음)도 실패로 취급', async () => {
    const bad500 = vi.fn(async () => new Response('oops', { status: 500 })) as unknown as typeof fetch
    const noKrw = vi.fn(async () => new Response(JSON.stringify({ rates: {} }), { status: 200 })) as unknown as typeof fetch
    expect((await getRate('JPY', { fetcher: bad500, storage: memoryStorage() })).source).toBe('none')
    expect((await getRate('JPY', { fetcher: noKrw, storage: memoryStorage() })).source).toBe('none')
  })

  test('저장소가 throw해도 앱이 죽지 않음', async () => {
    const broken = memoryStorage()
    broken.getItem = () => { throw new Error('blocked') }
    broken.setItem = () => { throw new Error('blocked') }
    expect((await getRate('JPY', { fetcher: okFetch(9.2), storage: broken })).source).toBe('live')
    expect((await getRate('JPY', { fetcher: failFetch(), storage: broken })).source).toBe('none')
  })
})
