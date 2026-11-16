import { describe, expect, test } from 'vitest'
import { makeItem } from '../test-fixtures'
import { formatDuration } from './routes'
import { fastestSec, isTight, tightPairs } from './tight'

const at = (time: string | null, located = true) =>
  makeItem({ time, ...(located ? { lat: 34.7, lng: 135.5 } : {}) })

describe('tightPairs (비교할 두 일정)', () => {
  test('시간·장소 있는 바로 붙은 두 일정 → 사이 시간(초)', () => {
    const [a, b] = [at('11:00'), at('11:20')]
    const pairs = tightPairs([a, b])
    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toMatchObject({ from: a, to: b, gapSec: 1200 })
  })

  test('장소 없는 일정이 끼면 그 앞뒤를 이어 비교하지 않음', () => {
    expect(tightPairs([at('11:00'), at('11:10', false), at('11:30')])).toEqual([])
  })

  test('시간 없는 일정이 끼면 그 앞뒤를 이어 비교하지 않음', () => {
    expect(tightPairs([at('11:00'), at(null), at('12:00')])).toEqual([])
  })

  test('다음 일정 시각이 앞보다 이르거나 같으면 비교 안 함', () => {
    expect(tightPairs([at('12:00'), at('11:00')])).toEqual([])
    expect(tightPairs([at('11:00'), at('11:00')])).toEqual([])
  })

  test('셋 다 유효하면 두 쌍, 목록 순서대로', () => {
    const [a, b, c] = [at('09:00'), at('10:00'), at('11:30')]
    const pairs = tightPairs([a, b, c])
    expect(pairs.map((p) => [p.from.id, p.to.id])).toEqual([[a.id, b.id], [b.id, c.id]])
    expect(pairs[1].gapSec).toBe(5400)
  })
})

describe('fastestSec / isTight', () => {
  test('구한 수단 중 빠른 쪽', () => {
    expect(fastestSec(2520, 2100)).toBe(2100)
    expect(fastestSec(null, 2100)).toBe(2100)
    expect(fastestSec(600, null)).toBe(600)
    expect(fastestSec(null, null)).toBeNull()
  })

  test('이동 시간이 사이 시간보다 길 때만 빠듯함 (같으면 아님, 모르면 아님)', () => {
    expect(isTight(1200, 2100)).toBe(true)
    expect(isTight(1200, 1200)).toBe(false)
    expect(isTight(1200, 600)).toBe(false)
    expect(isTight(1200, null)).toBe(false)
  })
})

describe('formatDuration (지도 탭과 같은 표기)', () => {
  test('분 / 시간 분 / 시간, 최소 1분', () => {
    expect(formatDuration(2100)).toBe('35분')
    expect(formatDuration(3900)).toBe('1시간 5분')
    expect(formatDuration(7200)).toBe('2시간')
    expect(formatDuration(10)).toBe('1분')
  })
})
