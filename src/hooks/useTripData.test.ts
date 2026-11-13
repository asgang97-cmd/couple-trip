import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { TRIP, makeItem } from '../test-fixtures'

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
      subscribe: vi.fn((_id: string, cb: () => void) => {
        onChange = cb
        return unsubscribe
      }),
    },
    fireChange: () => onChange?.(),
    unsubscribe,
  }
}

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

  test('불러오기 실패하면 error', async () => {
    const { repo } = fakeRepo([[]])
    repo.fetchTrip.mockRejectedValueOnce(new Error('down'))
    const { result } = renderHook(() => useTripData({ repo }))
    await waitFor(() => expect(result.current.status).toBe('error'))
  })
})
