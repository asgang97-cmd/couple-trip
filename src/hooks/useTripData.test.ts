import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { loadSnapshot, saveSnapshot } from '../lib/offlineCache'
import { TRIP, makeItem } from '../test-fixtures'
import { memoryStorage } from '../test-utils'
import type { PackingItem } from '../lib/types'

vi.mock('../lib/repo', () => ({}))
const { useTripData } = await import('./useTripData')

function fakeRepo(itemsSequence: ReturnType<typeof makeItem>[][]) {
  let call = 0
  let onChange: (() => void) | null = null
  const unsubscribe = vi.fn()
  return {
    repo: {
      fetchTrip: vi.fn(async () => TRIP),
      listItems: vi.fn(async () => itemsSequence[Math.min(call++, itemsSequence.length - 1)]),
      listHearts: vi.fn(async () => []),
      listComments: vi.fn(async () => []),
      listPacking: vi.fn(async (): Promise<PackingItem[]> => []),
      subscribe: vi.fn((_id: string, cb: () => void) => {
        onChange = cb
        return unsubscribe
      }),
    },
    fireChange: () => onChange?.(),
    unsubscribe,
  }
}

describe('useTripData 인터넷 복구', () => {
  test('로그인 정보를 새로 받으면 다시 불러와서 오프라인 상태가 풀림', async () => {
    const { repo } = fakeRepo([[makeItem()]])
    repo.fetchTrip.mockRejectedValueOnce(new Error('offline'))
    let refreshed: (() => void) | null = null
    const onAuthRefresh = (cb: () => void) => {
      refreshed = cb
      return () => {}
    }
    const storage = memoryStorage()
    saveSnapshot({ trip: TRIP, items: [], hearts: [], comments: [], savedAt: 'x' }, storage)
    const { result } = renderHook(() => useTripData({ repo, storage, onAuthRefresh }))
    await waitFor(() => expect(result.current.offline).toBe(true))
    await act(async () => refreshed!())
    await waitFor(() => expect(result.current.offline).toBe(false))
  })
})

describe('useTripData', () => {
  test('처음 불러오면 ready + items', async () => {
    const first = [makeItem({ place_name: '센소지' })]
    const { repo } = fakeRepo([first])
    const { result } = renderHook(() => useTripData({ repo }))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.trip).toEqual(TRIP)
    expect(result.current.items.map((i) => i.place_name)).toEqual(['센소지'])
  })

  test('subscribe 콜백이 불리면 다시 불러와 상대가 바꾼 내용 반영', async () => {
    const { repo, fireChange } = fakeRepo([[makeItem({ place_name: '전' })], [makeItem({ place_name: '후' })]])
    const { result } = renderHook(() => useTripData({ repo }))
    await waitFor(() => expect(result.current.items[0]?.place_name).toBe('전'))
    act(() => fireChange())
    await waitFor(() => expect(result.current.items[0]?.place_name).toBe('후'))
  })

  test('언마운트 시 구독 해제 함수 호출', async () => {
    const { repo, unsubscribe } = fakeRepo([[]])
    const { result, unmount } = renderHook(() => useTripData({ repo }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  test('불러오기 실패 + 저장본 없음 → error', async () => {
    const { repo } = fakeRepo([[]])
    repo.fetchTrip.mockRejectedValueOnce(new Error('down'))
    const { result } = renderHook(() => useTripData({ repo, storage: memoryStorage() }))
    await waitFor(() => expect(result.current.status).toBe('error'))
  })
})

describe('useTripData 오프라인', () => {
  test('성공하면 저장본을 남김', async () => {
    const storage = memoryStorage()
    const { repo } = fakeRepo([[makeItem({ place_name: '저장됨' })]])
    const { result } = renderHook(() => useTripData({ repo, storage }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(loadSnapshot(storage)?.items[0].place_name).toBe('저장됨')
  })

  test('불러오기 실패 + 저장본 있음 → 저장본으로 ready, offline', async () => {
    const storage = memoryStorage()
    saveSnapshot({ trip: TRIP, items: [makeItem({ place_name: '어제 본 일정' })], hearts: [], comments: [], savedAt: '2027-01-10T01:00:00.000Z' }, storage)
    const { repo } = fakeRepo([[]])
    repo.fetchTrip.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useTripData({ repo, storage }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.offline).toBe(true)
    expect(result.current.savedAt).toBe('2027-01-10T01:00:00.000Z')
    expect(result.current.items[0].place_name).toBe('어제 본 일정')
  })

  test('offline 이벤트 → offline, online 이벤트 → 다시 불러오고 해제', async () => {
    const { repo } = fakeRepo([[makeItem({ place_name: '1' })], [makeItem({ place_name: '2' })]])
    const { result } = renderHook(() => useTripData({ repo, storage: memoryStorage() }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => void window.dispatchEvent(new Event('offline')))
    expect(result.current.offline).toBe(true)
    act(() => void window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(result.current.items[0].place_name).toBe('2'))
    expect(result.current.offline).toBe(false)
  })

  test('보는 중에 다시 불러오기 실패하면 화면은 유지하고 offline', async () => {
    const { repo, fireChange } = fakeRepo([[makeItem({ place_name: '유지' })]])
    const { result } = renderHook(() => useTripData({ repo, storage: memoryStorage() }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    repo.fetchTrip.mockRejectedValueOnce(new Error('offline'))
    act(() => fireChange())
    await waitFor(() => expect(result.current.offline).toBe(true))
    expect(result.current.items[0].place_name).toBe('유지')
  })
})

describe('useTripData 준비물', () => {
  const P: PackingItem = { id: 'p1', trip_id: TRIP.id, name: '여권', owner: 'a', checked: false, created_at: 'x' }
  test('준비물도 같이 불러옴', async () => {
    const { repo } = fakeRepo([[]])
    repo.listPacking.mockResolvedValue([P])
    const { result } = renderHook(() => useTripData({ repo, storage: memoryStorage() }))
    await waitFor(() => expect(result.current.packing).toEqual([P]))
    expect(result.current.offline).toBe(false)
  })
  test('준비물 표가 아직 없어도(SQL 실행 전) 일정은 정상, 준비물은 빈 목록', async () => {
    const { repo } = fakeRepo([[makeItem({ place_name: '센소지' })]])
    repo.listPacking.mockRejectedValue(new Error('relation "packing_items" does not exist'))
    const { result } = renderHook(() => useTripData({ repo, storage: memoryStorage() }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.offline).toBe(false)
    expect(result.current.items[0].place_name).toBe('센소지')
    expect(result.current.packing).toEqual([])
  })
})

describe('useTripData 준비물 오프라인', () => {
  test('예전 저장본(준비물 칸 없음)으로 오프라인이면 준비물은 빈 목록', async () => {
    const storage = memoryStorage()
    saveSnapshot({ trip: TRIP, items: [], hearts: [], comments: [], savedAt: 'x' }, storage)
    const { repo } = fakeRepo([[]])
    repo.fetchTrip.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useTripData({ repo, storage }))
    await waitFor(() => expect(result.current.offline).toBe(true))
    expect(result.current.packing).toEqual([])
  })
})
