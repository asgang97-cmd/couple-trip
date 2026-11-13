import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { OfflineBanner } from './OfflineBanner'

describe('OfflineBanner', () => {
  test('온라인이면 안 보임', () => {
    const { container } = render(<OfflineBanner offline={false} savedAt={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  test('오프라인이면 언제 기준인지', () => {
    render(<OfflineBanner offline savedAt={new Date(2027, 0, 10, 15, 5).toISOString()} />)
    expect(screen.getByRole('status')).toHaveTextContent(/오프라인이에요 · 1\. 10\. 오후 03:05 기준 일정/)
  })
})
