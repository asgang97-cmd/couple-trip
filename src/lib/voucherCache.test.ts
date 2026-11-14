import { describe, expect, test, vi } from 'vitest'
import type { Voucher } from './types'
import { memoryFileCache, readVoucherFile, syncVouchers } from './voucherCache'

const V = (id: string, o: Partial<Voucher> = {}): Voucher => ({
  id, trip_id: 't', item_id: null, day: null, title: id, kind: 'image', path: `t/${id}.jpg`, pages: [], size: 1, created_at: 'x', ...o,
})

describe('syncVouchers: 폰에 미리 받아 두기', () => {
  test('없는 파일만 받고, 다 받은 바우처를 알려줌', async () => {
    const cache = memoryFileCache({ 't/a.jpg': new Blob(['a']) })
    const download = vi.fn(async (p: string) => new Blob([p]))
    const pdf = V('b', { kind: 'pdf', path: 't/b.pdf', pages: ['t/b-p1.jpg'] })
    const r = await syncVouchers([V('a'), pdf], cache, download)
    expect(download.mock.calls.map((c) => c[0]).sort()).toEqual(['t/b-p1.jpg', 't/b.pdf'])
    expect([...r.saved].sort()).toEqual(['a', 'b'])
    expect(r.failed).toBe(0)
  })

  test('지워진 바우처의 파일은 폰에서도 정리', async () => {
    const cache = memoryFileCache({ 't/old.jpg': new Blob(['o']), 't/a.jpg': new Blob(['a']) })
    await syncVouchers([V('a')], cache, vi.fn())
    expect(await cache.keys()).toEqual(['t/a.jpg'])
  })

  test('받기 실패(인터넷 끊김)·저장 공간 부족이어도 멈추지 않고 그 바우처만 "안 됨"', async () => {
    const cache = memoryFileCache()
    const realPut = cache.put
    cache.put = async (p, b) => {
      if (p === 't/c.jpg') throw new Error('QuotaExceededError')
      return realPut(p, b)
    }
    const download = vi.fn(async (p: string) => {
      if (p === 't/b.jpg') throw new Error('offline')
      return new Blob([p])
    })
    const r = await syncVouchers([V('a'), V('b'), V('c')], cache, download)
    expect([...r.saved]).toEqual(['a'])
    expect(r.failed).toBe(2)
  })
})

describe('readVoucherFile: 폰 저장본 먼저', () => {
  test('저장본이 있으면 인터넷 안 씀', async () => {
    const cache = memoryFileCache({ 't/a.jpg': new Blob(['saved']) })
    const download = vi.fn()
    const blob = await readVoucherFile('t/a.jpg', cache, download)
    expect(await blob.text()).toBe('saved')
    expect(download).not.toHaveBeenCalled()
  })

  test('없으면 받아서 저장해 두고 돌려줌', async () => {
    const cache = memoryFileCache()
    const blob = await readVoucherFile('t/a.jpg', cache, async () => new Blob(['net']))
    expect(await blob.text()).toBe('net')
    expect(await cache.has('t/a.jpg')).toBe(true)
  })
})

describe('syncVouchers 정리 끄기', () => {
  test('prune이 false면 목록에 없는 파일도 남김', async () => {
    const cache = memoryFileCache({ 't/old.jpg': new Blob(['o']) })
    await syncVouchers([], cache, vi.fn(), { prune: () => false })
    expect(await cache.has('t/old.jpg')).toBe(true)
  })
})
