import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { TRIP, makeItem } from '../test-fixtures'
import { ItemCard } from './ItemCard'

const base = { trip: TRIP, member: 'a' as const, disabled: false, onEdit: () => {} }

describe('ItemCard', () => {
  test('시간·장소·메모·작성자 표시, 시간 없으면 "시간 미정"', () => {
    render(<ItemCard {...base} item={makeItem({ place_name: '센소지', memo: '아침 일찍', created_by: 'b' })} />)
    expect(screen.getByText('센소지')).toBeInTheDocument()
    expect(screen.getByText('아침 일찍')).toBeInTheDocument()
    expect(screen.getByText('시간 미정')).toBeInTheDocument()
    expect(screen.getByLabelText('작성: 너')).toBeInTheDocument()
  })

  test('http(s) 예약 링크만 링크로 보여줌', () => {
    const { rerender } = render(<ItemCard {...base} item={makeItem({ booking_url: 'https://booking.com/x' })} />)
    expect(screen.getByRole('link', { name: '예약 페이지' })).toHaveAttribute('href', 'https://booking.com/x')
    rerender(<ItemCard {...base} item={makeItem({ booking_url: 'javascript:alert(1)' })} />)
    expect(screen.queryByRole('link', { name: '예약 페이지' })).toBeNull()
  })

  test('예약 번호 표시', () => {
    render(<ItemCard {...base} item={makeItem({ booking_code: 'ABC123' })} />)
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })
})
