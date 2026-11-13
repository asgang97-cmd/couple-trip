import type { Item } from './types'

/** 금액을 원화로. KRW는 그대로, 환율이 없으면 null. rate = 현지통화 1단위당 원. */
export function toKrw(amount: number, currency: string, rate: number | null): number | null {
  if (currency === 'KRW') return Math.round(amount)
  if (rate === null) return null
  return Math.round(amount * rate)
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(amount)
}

/** 비용 있는 항목의 원화 합계. 환율이 없어 환산 못 한 항목은 개수로 따로 센다. */
export function sumKrw(
  items: Item[],
  tripCurrency: string,
  rate: number | null,
): { totalKrw: number; unconvertedCount: number } {
  let totalKrw = 0
  let unconvertedCount = 0
  for (const it of items) {
    if (it.cost_amount === null) continue
    const currency = it.cost_currency || tripCurrency
    const krw = toKrw(it.cost_amount, currency, rate)
    if (krw === null) unconvertedCount++
    else totalKrw += krw
  }
  return { totalKrw, unconvertedCount }
}
