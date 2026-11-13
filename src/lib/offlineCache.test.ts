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

  test('저장소가 throw해도 예외 안 남', () => {
    const s = memoryStorage()
    s.setItem = () => { throw new Error('quota') }
    s.getItem = () => { throw new Error('blocked') }
    expect(() => saveSnapshot(snap, s)).not.toThrow()
    expect(loadSnapshot(s)).toBeNull()
  })
})
