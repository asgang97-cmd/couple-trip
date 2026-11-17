import { describe, expect, test } from 'vitest'
import { makeItem } from '../test-fixtures'
import type { PackingItem } from './types'
import { samePackingItems, samePlaceItems, sameName } from './duplicates'

let n = 0
const P = (o: Partial<PackingItem>): PackingItem => ({
  id: `p${++n}`, trip_id: 't', name: `물건${n}`, owner: 'both', checked: false, created_at: '2026-11-17T00:00:00Z', ...o,
})

describe('sameName', () => {
  test('공백·대소문자 무시, 빈 이름은 겹침 아님', () => {
    expect(sameName('센소지', ' 센 소지 ')).toBe(true)
    expect(sameName('Ichiran', 'ichiran')).toBe(true)
    expect(sameName('센소지', '이치란')).toBe(false)
    expect(sameName('', '  ')).toBe(false)
  })
})

describe('samePlaceItems', () => {
  test('장소 번호가 둘 다 있으면 번호로 (이름이 같아도 지점이 다르면 아님)', () => {
    const a = makeItem({ id: '1', place_name: '이치란', google_place_id: 'P1' })
    const b = makeItem({ id: '2', place_name: '이치란', google_place_id: 'P2' })
    const c = makeItem({ id: '3', place_name: '이치란 본점', google_place_id: 'P1' })
    expect(samePlaceItems({ place_name: '이치란', google_place_id: 'P1' }, [a, b, c]).map((i) => i.id)).toEqual(['1', '3'])
  })
  test('한쪽이라도 번호가 없으면 이름으로, 자기 자신은 뺌, 날짜·시간 순 (시간 없음은 뒤)', () => {
    const x = makeItem({ id: '1', day: '2026-12-02', time: null, place_name: '센소지', google_place_id: 'P1' })
    const y = makeItem({ id: '2', day: '2026-12-01', time: '14:00', place_name: '센 소지', google_place_id: null })
    const z = makeItem({ id: '3', day: '2026-12-01', time: null, place_name: '센소지', google_place_id: null })
    const self = makeItem({ id: '9', place_name: '센소지', google_place_id: null })
    expect(samePlaceItems({ id: '9', place_name: '센소지', google_place_id: null }, [x, z, y, self]).map((i) => i.id)).toEqual(['2', '3', '1'])
  })
  test('장소 이름이 비면 겹침 없음', () => {
    expect(samePlaceItems({ place_name: ' ', google_place_id: null }, [makeItem({ place_name: '' })])).toEqual([])
  })
})

describe('samePackingItems', () => {
  test('같이는 누구 것이든, 개인은 같이·같은 사람 것만 (챙긴 것도 포함)', () => {
    const both = P({ id: 'b', name: '우산', owner: 'both', checked: true })
    const a = P({ id: 'a', name: '여권', owner: 'a' })
    const b = P({ id: 'bb', name: '여권', owner: 'b' })
    expect(samePackingItems('여권', 'both', [both, a, b]).map((i) => i.id)).toEqual(['a', 'bb'])
    expect(samePackingItems('여권', 'a', [a, b]).map((i) => i.id)).toEqual(['a'])
    expect(samePackingItems('여권', 'b', [a]).map((i) => i.id)).toEqual([])
    expect(samePackingItems(' 우 산', 'a', [both]).map((i) => i.id)).toEqual(['b'])
  })
})
