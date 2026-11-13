import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 테스트마다 그린 화면과 가짜 함수 기록을 지움
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
