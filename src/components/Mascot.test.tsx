import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Mascot, Seat } from './Mascot'

describe('Mascot', () => {
  test('밤만쥬: 만쥬와 접시', () => {
    const { container } = render(<><Mascot kind="manju" /><Seat kind="manju" /></>)
    expect(container.querySelector('svg.manju')).not.toBeNull()
    expect(container.querySelector('svg.plate')).not.toBeNull()
  })
  test('개구리로 되돌리기: 개구리와 연잎', () => {
    const { container } = render(<><Mascot kind="frog" /><Seat kind="frog" /></>)
    expect(container.querySelector('svg.frog')).not.toBeNull()
    expect(container.querySelector('svg.lilypad')).not.toBeNull()
  })
  test('커플 리본', () => {
    const { container } = render(<Mascot kind="manju" bow />)
    expect(container.querySelectorAll('.manju-bow').length).toBe(2)
  })
  test('그림이라 화면 읽기에서는 숨김', () => {
    const { container } = render(<Mascot kind="manju" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
