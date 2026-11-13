import { useEffect, useState } from 'react'
import { getRate, type RateResult } from '../lib/rates'
import type { Trip } from '../lib/types'

export function useRate(trip: Trip | null): RateResult {
  const [result, setResult] = useState<RateResult>({ rate: null, source: 'none', fetchedAt: null })
  const currency = trip?.currency
  const manualRate = trip?.manual_rate ?? null

  useEffect(() => {
    if (!currency) return
    let alive = true
    getRate(currency, { manualRate }).then((r) => alive && setResult(r))
    return () => {
      alive = false
    }
  }, [currency, manualRate])

  return result
}
