import { beforeEach, describe, expect, test, vi } from 'vitest'
import { makeItem, TRIP } from '../test-fixtures'
import { memoryStorage } from '../test-utils'

// supabase 쿼리 체인 흉내: 어떤 메서드를 불렀는지 기록하고, 마지막에 result를 돌려줌
let calls: [string, ...unknown[]][] = []
let result: { data: unknown; error: unknown } = { data: null, error: null }
/** 차례대로 돌려줄 결과들 (비어 있으면 result) */
let queue: { data: unknown; error: unknown }[] = []
function chain(): unknown {
  return new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(queue.shift() ?? result)
        return (...args: unknown[]) => {
          calls.push([prop, ...args])
          return chain()
        }
      },
    },
  )
}
vi.mock('./supabase', () => ({
  supabase: {
    from: (t: string) => (calls.push(['from', t]), chain()),
    storage: { from: (b: string) => (calls.push(['bucket', b]), chain()) },
  },
}))

const { coverUrl, saveItem, updateTrip, uploadCover } = await import('./repo')
const names = () => calls.map((c) => c[0])

describe('saveItem', () => {
  beforeEach(() => {
    calls = []
  })

  test('새 일정은 insert', async () => {
    const { id: _id, created_at: _c, updated_at: _u, ...input } = makeItem()
    result = { data: { ...input, id: 'new' }, error: null }
    await saveItem(input)
    expect(names()).toContain('insert')
    expect(names()).not.toContain('upsert')
  })

  test('수정은 update + id 조건 (지워진 일정을 다시 만들지 않음)', async () => {
    const { created_at: _c, updated_at: _u, ...input } = makeItem({ id: 'x1' })
    result = { data: [{ ...input }], error: null }
    await saveItem(input)
    expect(names()).toContain('update')
    expect(calls).toContainEqual(['eq', 'id', 'x1'])
    expect(names()).not.toContain('upsert')
    expect(names()).not.toContain('insert')
  })

  test('그 사이 상대가 지운 일정이면 알려줌', async () => {
    const { created_at: _c, updated_at: _u, ...input } = makeItem({ id: 'gone' })
    result = { data: [], error: null }
    await expect(saveItem(input)).rejects.toThrow('이미 지워진 일정이에요')
  })
})

describe('uploadCover', () => {
  beforeEach(() => {
    calls = []
    queue = []
  })

  test('둘이 동시에 올려도 남는 파일 없게: 지금 커버로 기록된 파일만 남기고 폴더 정리', async () => {
    queue = [
      { data: { path: 'x' }, error: null }, // upload
      { data: null, error: null }, // trips update
      { data: { cover_path: 'trip-1/222.jpg' }, error: null }, // 지금 커버 다시 읽기 (상대 것이 이김)
      { data: [{ name: '111.jpg' }, { name: '222.jpg' }, { name: '000.jpg' }], error: null }, // 폴더 목록
      { data: null, error: null }, // remove
    ]
    await uploadCover({ ...TRIP, cover_path: 'trip-1/000.jpg' }, new Blob(['a']))
    expect(calls).toContainEqual(['list', 'trip-1'])
    const removed = calls.find((c) => c[0] === 'remove')![1] as string[]
    expect(removed.sort()).toEqual(['trip-1/000.jpg', 'trip-1/111.jpg'])
  })
})

describe('uploadCover 동시 업로드', () => {
  beforeEach(() => {
    calls = []
    queue = []
  })
  test('지금 커버보다 나중에 올라온 파일은(상대가 막 올리는 중) 지우지 않음', async () => {
    queue = [
      { data: { path: 'x' }, error: null },
      { data: null, error: null },
      { data: { cover_path: 'trip-1/200.jpg' }, error: null },
      { data: [{ name: '100.jpg' }, { name: '200.jpg' }, { name: '300.jpg' }], error: null },
      { data: null, error: null },
    ]
    await uploadCover(TRIP, new Blob(['a']))
    const removed = calls.find((c) => c[0] === 'remove')![1] as string[]
    expect(removed).toEqual(['trip-1/100.jpg'])
  })
})

describe('coverUrl (사진 주소를 기기에 저장해 재사용 → 브라우저·오프라인 캐시가 먹힘)', () => {
  const DAY = 86_400_000
  const signs = () => calls.filter((c) => c[0] === 'createSignedUrl').length
  beforeEach(() => {
    calls = []
    queue = []
  })

  test('같은 사진이면 저장해 둔 주소 재사용', async () => {
    const storage = memoryStorage()
    const now = new Date(2027, 0, 1).getTime()
    queue = [{ data: { signedUrl: 'https://s/1' }, error: null }]
    expect(await coverUrl('trip-1/a.jpg', { storage, now })).toBe('https://s/1')
    expect(await coverUrl('trip-1/a.jpg', { storage, now: now + 3 * DAY })).toBe('https://s/1')
    expect(signs()).toBe(1)
  })

  test('사진이 바뀌면 새 주소', async () => {
    const storage = memoryStorage()
    queue = [{ data: { signedUrl: 'https://s/1' }, error: null }, { data: { signedUrl: 'https://s/2' }, error: null }]
    await coverUrl('trip-1/a.jpg', { storage, now: 0 })
    expect(await coverUrl('trip-1/b.jpg', { storage, now: 0 })).toBe('https://s/2')
    expect(signs()).toBe(2)
  })

  test('주소 유효기간(7일)이 하루도 안 남았으면 새로 받음', async () => {
    const storage = memoryStorage()
    queue = [{ data: { signedUrl: 'https://s/1' }, error: null }, { data: { signedUrl: 'https://s/2' }, error: null }]
    await coverUrl('trip-1/a.jpg', { storage, now: 0 })
    expect(await coverUrl('trip-1/a.jpg', { storage, now: 6.5 * DAY })).toBe('https://s/2')
  })

  test('오프라인이라 새로 못 받으면, 기간이 지났어도 저장해 둔 주소라도 (사진은 기기 캐시에서)', async () => {
    const storage = memoryStorage()
    queue = [{ data: { signedUrl: 'https://s/1' }, error: null }, { data: null, error: { message: 'Failed to fetch' } }]
    await coverUrl('trip-1/a.jpg', { storage, now: 0 })
    expect(await coverUrl('trip-1/a.jpg', { storage, now: 30 * DAY })).toBe('https://s/1')
  })
})

describe('updateTrip', () => {
  const input = { title: '오사카', destination: '오사카', start_date: '2027-02-01', end_date: '2027-02-03' }
  beforeEach(() => {
    calls = []
    queue = []
  })
  test('그 여행만 이름·여행지·기간 수정', async () => {
    queue = [{ data: null, error: null }]
    await updateTrip('trip-1', input)
    expect(calls).toContainEqual(['from', 'trips'])
    expect(calls).toContainEqual(['update', input])
    expect(calls).toContainEqual(['eq', 'id', 'trip-1'])
  })
  test('실패하면 throw', async () => {
    queue = [{ data: null, error: { message: 'denied' } }]
    await expect(updateTrip('trip-1', input)).rejects.toThrow('denied')
  })
})
