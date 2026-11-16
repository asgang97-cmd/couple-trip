// 빠듯한 일정: 바로 붙은 두 일정 사이에 이동조차 못 하면 경고
import type { Item } from './types'

export interface TightPair { from: Item; to: Item; gapSec: number }

const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
const usable = (it: Item) => !!it.time && it.lat !== null && it.lng !== null

/** 목록 순서로 바로 붙은 두 일정 중 비교할 쌍 (둘 다 시간·장소 있고, 다음이 더 늦을 때만) */
export function tightPairs(items: Item[]): TightPair[] {
  const pairs: TightPair[] = []
  for (let i = 0; i + 1 < items.length; i++) {
    const [from, to] = [items[i], items[i + 1]]
    if (!usable(from) || !usable(to)) continue
    const gapSec = (minutesOf(to.time!) - minutesOf(from.time!)) * 60
    if (gapSec > 0) pairs.push({ from, to, gapSec })
  }
  return pairs
}

/** 도보·대중교통 중 구한 것의 빠른 쪽 (둘 다 모르면 null) */
export function fastestSec(walkSec: number | null, transitSec: number | null): number | null {
  const known = [walkSec, transitSec].filter((s): s is number => s !== null)
  return known.length ? Math.min(...known) : null
}

/** 빠른 쪽으로도 사이 시간 안에 못 가면 빠듯함 */
export function isTight(gapSec: number, fastest: number | null): boolean {
  return fastest !== null && fastest > gapSec
}
