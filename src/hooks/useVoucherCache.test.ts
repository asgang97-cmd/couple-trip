import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { Voucher } from '../lib/types'
import { memoryFileCache } from '../lib/voucherCache'
import { useVoucherCache } from './useVoucherCache'

const V = (id: string): Voucher => ({
  id, trip_id: 't', item_id: null, day: null, title: id, kind: 'image', path: `t/${id}.jpg`, pages: [], size: 1, created_at: 'x',
})

describe('useVoucherCache', () => {
  test('온라인이면 받아 두고 "폰에 저장됨"으로 표시', async () => {
    const cache = memoryFileCache()
    const download = vi.fn(async (p: string) => new Blob([p]))
    const { result } = renderHook(() => useVoucherCache([V('a')], false, { cache, download, persist: () => {} }))
    await waitFor(() => expect(result.current.isSaved('a')).toBe(true))
    expect(download).toHaveBeenCalledWith('t/a.jpg')
  })

  test('오프라인이면 받지 않고, 폰에 있는 것만 저장됨으로', async () => {
    const cache = memoryFileCache({ 't/a.jpg': new Blob(['a']) })
    const download = vi.fn()
    const { result } = renderHook(() => useVoucherCache([V('a'), V('b')], true, { cache, download, persist: () => {} }))
    await waitFor(() => expect(result.current.isSaved('a')).toBe(true))
    expect(result.current.isSaved('b')).toBe(false)
    expect(download).not.toHaveBeenCalled()
  })

  test('처음 받을 때 브라우저에 오래 보관을 요청', async () => {
    const persist = vi.fn()
    renderHook(() => useVoucherCache([V('a')], false, { cache: memoryFileCache(), download: async () => new Blob(['x']), persist }))
    await waitFor(() => expect(persist).toHaveBeenCalled())
  })

  test('파일 읽기는 저장본 먼저', async () => {
    const cache = memoryFileCache({ 't/a.jpg': new Blob(['saved']) })
    const download = vi.fn()
    const { result } = renderHook(() => useVoucherCache([], true, { cache, download, persist: () => {} }))
    expect(await (await result.current.read('t/a.jpg')).text()).toBe('saved')
    expect(download).not.toHaveBeenCalled()
  })
})

describe('useVoucherCache 지우기 안전장치', () => {
  test('일정을 불러오는 중(null)에는 아무것도 지우지 않고, 불러온 뒤에도 저장본 유지', async () => {
    const cache = memoryFileCache({ 't/a.jpg': new Blob(['a']) })
    const download = vi.fn(async (p: string) => new Blob([p]))
    const { result, rerender } = renderHook(({ list }) => useVoucherCache(list, false, { cache, download, persist: () => {} }), {
      initialProps: { list: null as Voucher[] | null },
    })
    await new Promise((r) => setTimeout(r, 20))
    expect(await cache.has('t/a.jpg')).toBe(true)
    rerender({ list: [V('a')] })
    await waitFor(() => expect(result.current.isSaved('a')).toBe(true))
    expect(download).not.toHaveBeenCalled()
  })

  test('목록이 예전 것(불러오기 실패)이면 정리하지 않음', async () => {
    const cache = memoryFileCache({ 't/a.jpg': new Blob(['a']), 't/b.jpg': new Blob(['b']) })
    renderHook(() => useVoucherCache([V('a')], false, { cache, download: async () => new Blob(['x']), persist: () => {}, prune: false }))
    await new Promise((r) => setTimeout(r, 20))
    expect(await cache.has('t/b.jpg')).toBe(true)
  })

  test('받기가 겹쳐도 새로 받은 파일을 예전 정리가 지우지 않음', async () => {
    const cache = memoryFileCache()
    let releaseA: () => void = () => {}
    const download = vi.fn((p: string) =>
      p === 't/a.jpg' ? new Promise<Blob>((r) => { releaseA = () => r(new Blob(['a'])) }) : Promise.resolve(new Blob([p])),
    )
    const { result, rerender } = renderHook(({ list }) => useVoucherCache(list, false, { cache, download, persist: () => {} }), {
      initialProps: { list: [V('a')] },
    })
    rerender({ list: [V('a'), V('b')] })
    await new Promise((r) => setTimeout(r, 10))
    releaseA()
    await waitFor(() => expect(result.current.isSaved('b')).toBe(true))
    await new Promise((r) => setTimeout(r, 20))
    expect(await cache.has('t/b.jpg')).toBe(true)
    expect(await cache.has('t/a.jpg')).toBe(true)
  })
})
