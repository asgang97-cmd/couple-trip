import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { CategoryBar } from './CategoryBar'

const bar = () => screen.getByRole('group', { name: '종류별로 보기' })

describe('CategoryBar', () => {
  test('전체 + 6개, 고른 것만 눌림', () => {
    render(<CategoryBar value="food" onChange={() => {}} />)
    const buttons = within(bar()).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['전체', '🏨 숙소', '🚃 교통', '🍜 식사', '⛩️ 관광', '🛍️ 쇼핑', '📌 기타'])
    expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)).toEqual(['🍜 식사'])
  })

  test('아무것도 안 골랐으면 전체가 눌림', () => {
    render(<CategoryBar value={null} onChange={() => {}} />)
    expect(within(bar()).getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('누르면 onChange(값), 전체는 onChange(null)', async () => {
    const onChange = vi.fn()
    render(<CategoryBar value="food" onChange={onChange} />)
    await userEvent.click(within(bar()).getByRole('button', { name: '🏨 숙소' }))
    await userEvent.click(within(bar()).getByRole('button', { name: '전체' }))
    expect(onChange.mock.calls).toEqual([['stay'], [null]])
  })
})
