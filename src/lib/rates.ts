export type RateSource = 'manual' | 'live' | 'cached' | 'identity' | 'none'

export interface RateResult {
  rate: number | null
  source: RateSource
  fetchedAt: string | null
}

interface RateOptions {
  manualRate?: number | null
  fetcher?: typeof fetch
  storage?: Storage
  now?: () => Date
}

const cacheKey = (currency: string) => `rate:${currency}`

function readCache(storage: Storage | undefined, currency: string): { rate: number; fetchedAt: string } | null {
  try {
    const raw = storage?.getItem(cacheKey(currency))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed?.rate === 'number' && typeof parsed?.fetchedAt === 'string' ? parsed : null
  } catch {
    return null
  }
}

function writeCache(storage: Storage | undefined, currency: string, value: { rate: number; fetchedAt: string }) {
  try {
    storage?.setItem(cacheKey(currency), JSON.stringify(value))
  } catch {
    // 사생활 보호 모드 등에서 저장이 막혀도 무시
  }
}

/**
 * 현지통화 1단위 = 몇 원인지.
 * 순서: KRW(1) → 수동 환율 → 실시간 → 마지막 저장값 → 없음
 */
export async function getRate(currency: string, opts: RateOptions = {}): Promise<RateResult> {
  const {
    manualRate = null,
    fetcher = globalThis.fetch,
    storage = globalThis.localStorage,
    now = () => new Date(),
  } = opts

  if (currency === 'KRW') return { rate: 1, source: 'identity', fetchedAt: null }
  if (manualRate !== null) return { rate: manualRate, source: 'manual', fetchedAt: null }

  try {
    const res = await fetcher(`https://api.frankfurter.dev/v1/latest?base=${currency}&symbols=KRW`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const rate = json?.rates?.KRW
    if (typeof rate !== 'number') throw new Error('KRW 환율 없음')
    const fetchedAt = now().toISOString()
    writeCache(storage, currency, { rate, fetchedAt })
    return { rate, source: 'live', fetchedAt }
  } catch {
    const cached = readCache(storage, currency)
    if (cached) return { rate: cached.rate, source: 'cached', fetchedAt: cached.fetchedAt }
    return { rate: null, source: 'none', fetchedAt: null }
  }
}
