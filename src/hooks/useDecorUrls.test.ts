import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { useDecorUrls } from './useDecorUrls'

describe('useDecorUrls', () => {
  test('넣은 사진마다 주소를 받아 알려줌', async () => {
    const onChange = vi.fn()
    const sign = vi.fn(async (p: string) => `https://s/${p}`)
    renderHook(() => useDecorUrls({ gate: { path: 'g.png', round: false }, day: { path: 'd.jpg', round: true } }, onChange, sign))
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ gate: { url: 'https://s/g.png', round: false }, day: { url: 'https://s/d.jpg', round: true } }),
    )
  })
  test('주소를 못 받은 자리는 빼고 (나머지는 보이게)', async () => {
    const onChange = vi.fn()
    const sign = vi.fn(async (p: string) => { if (p === 'bad') throw new Error('x'); return 'https://s/ok' })
    renderHook(() => useDecorUrls({ gate: { path: 'bad', round: false }, day: { path: 'ok', round: false } }, onChange, sign))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ day: { url: 'https://s/ok', round: false } }))
  })
  test('꾸미기 정보가 아직 없으면(불러오는 중) 아무것도 안 바꿈', async () => {
    const onChange = vi.fn()
    renderHook(() => useDecorUrls(undefined, onChange, vi.fn()))
    await new Promise((r) => setTimeout(r, 20))
    expect(onChange).not.toHaveBeenCalled()
  })
})
