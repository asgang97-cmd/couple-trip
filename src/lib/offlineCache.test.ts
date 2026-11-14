import { describe, expect, test } from 'vitest'
import { TRIP, makeItem } from '../test-fixtures'
import { memoryStorage } from '../test-utils'
import { loadSnapshot, saveSnapshot, type Snapshot } from './offlineCache'

const snap: Snapshot = { trip: TRIP, items: [makeItem()], hearts: [], comments: [], savedAt: '2027-01-10T01:00:00.000Z' }

describe('offlineCache', () => {
  test('저장 → 읽기 동일', () => {
    const s = memoryStorage()
    saveSnapshot(snap, s)
    expect(loadSnapshot(s)).toEqual(snap)
  })

  test('없거나 깨진 값이면 null', () => {
    expect(loadSnapshot(memoryStorage())).toBeNull()
    expect(loadSnapshot(memoryStorage({ 'snapshot:v1': '{broken' }))).toBeNull()
    expect(loadSnapshot(memoryStorage({ 'snapshot:v1': '{"items":[]}' }))).toBeNull()
  })

  test('공간이 꽉 차면 지도 경로 저장본을 비우고 다시 저장 (오프라인용 일정이 더 중요)', () => {
    const s = memoryStorage({ 'route:v2:walk:x': 'big' })
    const realSet = s.setItem
    s.setItem = (k, v) => {
      if (s.getItem('route:v2:walk:x') !== null) throw new Error('QuotaExceededError')
      realSet(k, v)
    }
    saveSnapshot(snap, s)
    expect(loadSnapshot(s)).toEqual(snap)
    expect(s.getItem('route:v2:walk:x')).toBeNull()
  })

  test('준비물도 저장', () => {
    const s = memoryStorage()
    const packing = [{ id: 'p1', trip_id: TRIP.id, name: '여권', owner: 'a' as const, checked: false, created_at: 'x' }]
    saveSnapshot({ ...snap, packing }, s)
    expect(loadSnapshot(s)?.packing).toEqual(packing)
  })

  test('준비물이 배열이 아니면 깨진 저장본', () => {
    const s = memoryStorage({ 'snapshot:v1': JSON.stringify({ ...snap, packing: 'x' }) })
    expect(loadSnapshot(s)).toBeNull()
  })

  test('저장소가 throw해도 예외 안 남', () => {
    const s = memoryStorage()
    s.setItem = () => { throw new Error('quota') }
    s.getItem = () => { throw new Error('blocked') }
    expect(() => saveSnapshot(snap, s)).not.toThrow()
    expect(loadSnapshot(s)).toBeNull()
  })
})
