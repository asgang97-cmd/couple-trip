import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useNow } from './useNow'

describe('useNow', () => {
  afterEach(() => vi.useRealTimers())

  test('앱을 백그라운드에서 다시 열면(다음 날 등) 지금 시각을 새로 (D-day·오늘 탭이 안 멈춤)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 9, 23, 0))
    const { result } = renderHook(() => useNow())
    expect(result.current.getDate()).toBe(9)
    vi.setSystemTime(new Date(2027, 0, 10, 8, 0))
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(result.current.getDate()).toBe(10)
  })
})
