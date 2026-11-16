import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { PlaceHours } from '../lib/hours'
import { usePlaceHours, type LoadHours } from './usePlaceHours'

const H: PlaceHours = { regular: [{ open: { day: 2, hour: 11, minute: 0 }, close: { day: 2, hour: 21, minute: 0 } }], current: null }

describe('usePlaceHours', () => {
  test('같은 장소는 한 번만 묻고, 받은 장소만 결과에', async () => {
    const load = vi.fn<LoadHours>(async (id) => (id === 'p1' ? H : null))
    const { result } = renderHook(() => usePlaceHours(['p1', 'p1', 'p2'], { apiKey: 'key', loadHours: load }))
    await waitFor(() => expect(result.current).toEqual({ p1: H }))
    expect(load.mock.calls.map((c) => c[0]).sort()).toEqual(['p1', 'p2'])
  })

  test('요청이 에러 나도 그 장소만 빠짐', async () => {
    const load = vi.fn<LoadHours>(async (id) => {
      if (id === 'bad') throw new Error('boom')
      return H
    })
    const { result } = renderHook(() => usePlaceHours(['bad', 'p1'], { apiKey: 'key', loadHours: load }))
    await waitFor(() => expect(result.current).toEqual({ p1: H }))
  })

  test('API 키가 없으면 묻지 않음', async () => {
    const load = vi.fn<LoadHours>(async () => H)
    const { result } = renderHook(() => usePlaceHours(['p1'], { apiKey: '', loadHours: load }))
    await Promise.resolve()
    expect(load).not.toHaveBeenCalled()
    expect(result.current).toEqual({})
  })

  test('날짜를 빨리 바꾸면 이전 날짜의 늦은 결과는 버림', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => (release = r))
    const load = vi.fn<LoadHours>(async (id) => {
      if (id === 'old') await gate
      return H
    })
    const { result, rerender } = renderHook(({ ids }) => usePlaceHours(ids, { apiKey: 'key', loadHours: load }), {
      initialProps: { ids: ['old'] },
    })
    rerender({ ids: ['new'] })
    await waitFor(() => expect(result.current).toEqual({ new: H }))
    release()
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current).toEqual({ new: H })
  })
})
