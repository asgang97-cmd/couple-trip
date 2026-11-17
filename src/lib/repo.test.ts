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
    rpc: (...a: unknown[]) => (calls.push(['rpc', ...a]), chain()),
    storage: { from: (b: string) => (calls.push(['bucket', b]), chain()) },
  },
}))

const { removeDecor, signedUrl, uploadDecor, addExpense, deleteExpense, listExpenses, addPacking, addPackingMany, coverUrl, deleteVoucher, listVouchers, updateVoucher, uploadVoucher, deletePacking, listPacking, saveItem, setPackingChecked, setPackingOwner, updateTrip, uploadCover, CATEGORY_NEEDS_SQL } = await import('./repo')
const names = () => calls.map((c) => c[0])

describe('saveItem', () => {
  beforeEach(() => {
    calls = []
    queue = []
  })

  // SQL 009 실행 전: 서버에 category 칸이 없음
  const noColumn = { data: null, error: { code: 'PGRST204', message: "Could not find the 'category' column of 'items' in the schema cache" } }

  test('009 전 + 종류 안 고름: category 빼고 한 번 더 저장 (예전처럼 동작)', async () => {
    const { id: _id, created_at: _c, updated_at: _u, ...input } = makeItem({ category: null })
    queue = [noColumn, { data: { ...input, id: 'new' }, error: null }]
    await saveItem(input)
    const inserts = calls.filter((c) => c[0] === 'insert')
    expect(inserts).toHaveLength(2)
    expect(inserts[1][1]).not.toHaveProperty('category')
  })

  test('009 전 + 수정에서도 종류 없으면 빼고 다시', async () => {
    const { created_at: _c, updated_at: _u, ...input } = makeItem({ id: 'x2', category: null })
    queue = [noColumn, { data: [{ ...input }], error: null }]
    await saveItem(input)
    const updates = calls.filter((c) => c[0] === 'update')
    expect(updates).toHaveLength(2)
    expect(updates[1][1]).not.toHaveProperty('category')
  })

  test('009 전 + 종류 고름: SQL 먼저 실행하라고 알림', async () => {
    const { id: _id, created_at: _c, updated_at: _u, ...input } = makeItem({ category: 'food' })
    queue = [noColumn]
    await expect(saveItem(input)).rejects.toThrow(CATEGORY_NEEDS_SQL)
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

describe('uploadCover 꾸미기 사진 보호', () => {
  beforeEach(() => {
    calls = []
    queue = []
  })
  test('같은 폴더의 꾸미기 사진(decor-…)은 커버 정리 때 지우지 않음', async () => {
    queue = [
      { data: { path: 'x' }, error: null },
      { data: null, error: null },
      { data: { cover_path: 'trip-1/200.jpg' }, error: null },
      { data: [{ name: '100.jpg' }, { name: '200.jpg' }, { name: 'decor-coverA-50.png' }, { name: 'decor-background-60.jpg' }], error: null },
      { data: null, error: null },
    ]
    await uploadCover(TRIP, new Blob(['a']))
    const removed = calls.find((c) => c[0] === 'remove')![1] as string[]
    expect(removed).toEqual(['trip-1/100.jpg'])
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
    queue = [{ data: [{ id: 'trip-1' }], error: null }]
    await updateTrip('trip-1', input)
    expect(calls).toContainEqual(['from', 'trips'])
    expect(calls).toContainEqual(['update', input])
    expect(calls).toContainEqual(['eq', 'id', 'trip-1'])
  })
  test('실패하면 throw', async () => {
    queue = [{ data: null, error: { message: 'denied' } }]
    await expect(updateTrip('trip-1', input)).rejects.toThrow('denied')
  })
  test('아무것도 안 바뀌었으면(로그인 끊김 등) 조용히 넘어가지 않고 throw', async () => {
    queue = [{ data: [], error: null }]
    await expect(updateTrip('trip-1', input)).rejects.toThrow()
  })
})

describe('준비물', () => {
  beforeEach(() => {
    calls = []
    queue = []
  })
  test('목록: 그 여행 것만, 순서대로', async () => {
    queue = [{ data: [{ id: 'p1' }], error: null }]
    expect(await listPacking('trip-1')).toEqual([{ id: 'p1' }])
    expect(calls).toContainEqual(['from', 'packing_items'])
    expect(calls).toContainEqual(['eq', 'trip_id', 'trip-1'])
  })
  test('추가: 이름 앞뒤 공백 없이, 누가 챙길지와 함께', async () => {
    queue = [{ data: { id: 'p2' }, error: null }]
    await addPacking('trip-1', ' 여권 ', 'a')
    expect(calls).toContainEqual(['insert', { trip_id: 'trip-1', name: '여권', owner: 'a' }])
  })
  test('체크·챙길 사람 바꾸기·지우기는 그 줄만', async () => {
    queue = [{ data: null, error: null }, { data: null, error: null }, { data: null, error: null }]
    await setPackingChecked('p1', true)
    await setPackingOwner('p1', 'both')
    await deletePacking('p1')
    expect(calls).toContainEqual(['update', { checked: true }])
    expect(calls).toContainEqual(['update', { owner: 'both' }])
    expect(calls).toContainEqual(['delete'])
    expect(calls.filter((c) => c[0] === 'eq' && c[1] === 'id' && c[2] === 'p1')).toHaveLength(3)
  })
  test('실패하면 throw', async () => {
    queue = [{ data: null, error: { message: 'denied' } }]
    await expect(setPackingChecked('p1', true)).rejects.toThrow('denied')
  })
})

describe('준비물 한 번에 넣기', () => {
  beforeEach(() => {
    calls = []
    queue = []
  })
  test('한 번의 insert로 (전부 들어가거나 하나도 안 들어감)', async () => {
    queue = [{ data: null, error: null }]
    await addPackingMany('trip-1', ['여권', ' 우산 '])
    const inserts = calls.filter((c) => c[0] === 'insert')
    expect(inserts).toEqual([['insert', [
      { trip_id: 'trip-1', name: '여권', owner: 'both' },
      { trip_id: 'trip-1', name: '우산', owner: 'both' },
    ]]])
  })
})

describe('바우처', () => {
  beforeEach(() => {
    calls = []
    queue = []
  })
  const pdf = { kind: 'pdf' as const, main: new Blob(['%PDF']), pages: [new Blob(['p1']), new Blob(['p2'])], text: '' }

  test('목록: 그 여행 것만', async () => {
    queue = [{ data: [{ id: 'v1' }], error: null }]
    expect(await listVouchers('trip-1')).toEqual([{ id: 'v1' }])
    expect(calls).toContainEqual(['from', 'vouchers'])
    expect(calls).toContainEqual(['eq', 'trip_id', 'trip-1'])
  })

  test('올리기: 원본 + 페이지 그림 올리고 한 줄 추가', async () => {
    queue = [{ data: {}, error: null }, { data: {}, error: null }, { data: {}, error: null }, { data: { id: 'x' }, error: null }]
    await uploadVoucher({ tripId: 'trip-1', prepared: pdf, title: 'KE703', itemId: 'i1', day: '2027-01-10' })
    const uploads = calls.filter((c) => c[0] === 'upload').map((c) => c[1] as string)
    expect(uploads).toHaveLength(3)
    expect(uploads[0]).toMatch(/^trip-1\/.+\.pdf$/)
    expect(uploads[1]).toMatch(/^trip-1\/.+-p1\.jpg$/)
    const insert = calls.find((c) => c[0] === 'insert')![1] as Record<string, unknown>
    expect(insert).toMatchObject({ trip_id: 'trip-1', item_id: 'i1', day: '2027-01-10', title: 'KE703', kind: 'pdf', path: uploads[0], pages: uploads.slice(1) })
  })

  test('중간에 실패하면 이미 올린 파일을 지우고 throw', async () => {
    queue = [{ data: {}, error: null }, { data: null, error: { message: 'too big' } }, { data: null, error: null }]
    await expect(uploadVoucher({ tripId: 'trip-1', prepared: pdf, title: 'x', itemId: null, day: null })).rejects.toThrow('too big')
    const removed = calls.find((c) => c[0] === 'remove')![1] as string[]
    expect(removed).toHaveLength(1)
    expect(calls.some((c) => c[0] === 'insert')).toBe(false)
  })

  test('수정: 그 줄만, 지워졌으면 throw', async () => {
    queue = [{ data: [{ id: 'v1' }], error: null }]
    await updateVoucher('v1', { title: '새 이름', item_id: null, day: '2027-01-11' })
    expect(calls).toContainEqual(['update', { title: '새 이름', item_id: null, day: '2027-01-11' }])
    queue = [{ data: [], error: null }]
    await expect(updateVoucher('v1', { title: 'a', item_id: null, day: null })).rejects.toThrow()
  })

  test('지우기: 줄을 지우고 파일도 정리', async () => {
    queue = [{ data: null, error: null }, { data: null, error: null }]
    await deleteVoucher({ id: 'v1', path: 't/a.pdf', pages: ['t/a-p1.jpg'] })
    expect(calls).toContainEqual(['eq', 'id', 'v1'])
    expect(calls).toContainEqual(['remove', ['t/a.pdf', 't/a-p1.jpg']])
  })
})

describe('가계부', () => {
  beforeEach(() => {
    calls = []
    queue = []
  })
  const e = { id: 'e1', trip_id: 'trip-1', day: '2027-01-10', amount: 1200, currency: 'JPY', paid_by: 'a' as const, memo: '라멘', created_at: 'x' }
  test('목록', async () => {
    queue = [{ data: [e], error: null }]
    expect(await listExpenses('trip-1')).toEqual([e])
    expect(calls).toContainEqual(['from', 'expenses'])
    expect(calls).toContainEqual(['eq', 'trip_id', 'trip-1'])
  })
  test('추가는 같은 id면 무시 (오프라인에서 적은 게 두 번 올라가도 한 줄)', async () => {
    queue = [{ data: null, error: null }]
    await addExpense(e)
    expect(calls).toContainEqual(['upsert', e, { onConflict: 'id', ignoreDuplicates: true }])
  })
  test('지우기', async () => {
    queue = [{ data: null, error: null }]
    await deleteExpense('e1')
    expect(calls).toContainEqual(['eq', 'id', 'e1'])
  })
})

describe('꾸미기 사진', () => {
  beforeEach(() => {
    calls = []
    queue = []
  })
  test('올리기: 파일 올리고, 최신 꾸미기 정보에 그 자리만 바꿔 저장, 예전 파일 정리', async () => {
    queue = [
      { data: {}, error: null }, // upload
      { data: null, error: { code: 'PGRST202', message: 'not found' } }, // 008 실행 전: 함수 없음 → 예전 방식
      { data: { decor: { coverA: { path: 'trip-1/old-a.png', round: false }, gate: { path: 'trip-1/g.png', round: false } } }, error: null }, // 최신 읽기
      { data: [{ id: 'trip-1' }], error: null }, // update
      { data: null, error: null }, // remove old
    ]
    await uploadDecor('trip-1', 'coverA', new Blob(['png'], { type: 'image/png' }), false)
    const up = calls.find((c) => c[0] === 'upload')!
    expect(up[1]).toMatch(/^trip-1\/decor-coverA-\d+\.png$/)
    const upd = calls.find((c) => c[0] === 'update')![1] as { decor: Record<string, { path: string; round: boolean }> }
    expect(upd.decor.coverA).toEqual({ path: up[1], round: false })
    expect(upd.decor.gate).toEqual({ path: 'trip-1/g.png', round: false })
    expect(calls).toContainEqual(['remove', ['trip-1/old-a.png']])
  })
  test('빼기: 그 자리만 지우고 파일도 정리', async () => {
    queue = [
      { data: null, error: { code: 'PGRST202', message: 'not found' } },
      { data: { decor: { day: { path: 'trip-1/d.jpg', round: true }, empty: { path: 'trip-1/e.png', round: false } } }, error: null },
      { data: [{ id: 'trip-1' }], error: null },
      { data: null, error: null },
    ]
    await removeDecor('trip-1', 'day')
    const upd = calls.find((c) => c[0] === 'update')![1] as { decor: Record<string, unknown> }
    expect(upd.decor).toEqual({ empty: { path: 'trip-1/e.png', round: false } })
    expect(calls).toContainEqual(['remove', ['trip-1/d.jpg']])
  })
  test('008 있으면: 데이터베이스 안에서 그 자리만 한 번에 바꿈 (동시에 바꿔도 안 덮어씀)', async () => {
    queue = [
      { data: {}, error: null }, // upload
      { data: { path: 'trip-1/old-a.png', round: false }, error: null }, // rpc → 예전 값
      { data: null, error: null }, // remove old
    ]
    await uploadDecor('trip-1', 'coverA', new Blob(['png'], { type: 'image/png' }), false)
    const up = calls.find((c) => c[0] === 'upload')!
    expect(calls).toContainEqual(['rpc', 'set_decor_slot', { p_trip: 'trip-1', p_slot: 'coverA', p_item: { path: up[1], round: false } }])
    expect(names()).not.toContain('update')
    expect(calls).toContainEqual(['remove', ['trip-1/old-a.png']])
  })
  test('저장은 됐는데 예전 파일 정리가 실패해도 새 사진은 지우지 않음', async () => {
    queue = [
      { data: {}, error: null },
      { data: { path: 'trip-1/old-a.png', round: false }, error: null },
    ]
    const real = calls.push.bind(calls)
    calls.push = (...items) => {
      if (items[0]?.[0] === 'remove') throw new Error('Failed to fetch')
      return real(...items)
    }
    try {
      await uploadDecor('trip-1', 'coverA', new Blob(['png'], { type: 'image/png' }), false)
    } finally {
      calls.push = real
    }
    expect(names()).not.toContain('remove')
  })
  test('저장이 실패하면 새로 올린 파일만 치우고 실패를 알림', async () => {
    queue = [
      { data: {}, error: null },
      { data: null, error: { code: '42501', message: 'denied' } },
      { data: null, error: null },
    ]
    await expect(uploadDecor('trip-1', 'gate', new Blob(['j'], { type: 'image/jpeg' }), true)).rejects.toThrow('denied')
    const up = calls.find((c) => c[0] === 'upload')!
    expect(calls.filter((c) => c[0] === 'remove')).toEqual([['remove', [up[1]]]])
  })
  test('signedUrl: 주소를 새로 받은 사진은 맨 뒤로 → 30개 넘어 정리해도 안 지워짐', async () => {
    const storage = memoryStorage()
    const DAY = 86_400_000
    queue = Array.from({ length: 32 }, (_, i) => ({ data: { signedUrl: `https://s/${i}` }, error: null }))
    await signedUrl('t/first.png', { storage, now: 0 })
    for (let i = 0; i < 29; i++) await signedUrl(`t/${i}.png`, { storage, now: 0 })
    await signedUrl('t/first.png', { storage, now: 6.5 * DAY }) // 기간이 다 돼서 새로 받음
    await signedUrl('t/new.png', { storage, now: 6.5 * DAY }) // 31개째 → 가장 오래된 것 정리
    const saved = JSON.parse(storage.getItem('signed-urls:v1')!) as Record<string, unknown>
    expect(Object.keys(saved)).toHaveLength(30)
    expect(saved['t/first.png']).toBeDefined()
    expect(saved['t/0.png']).toBeUndefined()
  })
  test('signedUrl: 사진마다 주소를 기기에 저장해 재사용', async () => {
    const storage = memoryStorage()
    queue = [{ data: { signedUrl: 'https://s/a' }, error: null }, { data: { signedUrl: 'https://s/b' }, error: null }]
    expect(await signedUrl('t/a.png', { storage, now: 0 })).toBe('https://s/a')
    expect(await signedUrl('t/b.png', { storage, now: 0 })).toBe('https://s/b')
    expect(await signedUrl('t/a.png', { storage, now: 1000 })).toBe('https://s/a')
    expect(calls.filter((c) => c[0] === 'createSignedUrl')).toHaveLength(2)
  })
})
