import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { directionsUrl } from '../lib/maps'
import { TRIP, makeItem } from '../test-fixtures'
import { theme } from '../theme'
import { ItemCard } from './ItemCard'

const base = {
  trip: TRIP, member: 'a' as const, rate: 9.2, disabled: false, onEdit: () => {},
  hearts: [], comments: [], onToggleHeart: async () => {}, onAddComment: async () => {},
  onEditComment: async () => {}, onDeleteComment: async () => {},
  vouchers: [], onOpenVoucher: () => {}, onAddVoucher: () => {},
}

describe('ItemCard 하트·댓글', () => {
  const item = makeItem({ id: 'it' })

  test('내가 안 눌렀으면 켜기, 눌렀으면 끄기', async () => {
    const onToggleHeart = vi.fn(async () => {})
    const { rerender } = render(<ItemCard {...base} item={item} onToggleHeart={onToggleHeart} />)
    await userEvent.click(screen.getByRole('button', { name: '하트' }))
    expect(onToggleHeart).toHaveBeenLastCalledWith(true)
    rerender(<ItemCard {...base} item={item} onToggleHeart={onToggleHeart} hearts={[{ item_id: 'it', member: 'a' }]} />)
    expect(screen.getByRole('button', { name: '하트' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: '하트' }))
    expect(onToggleHeart).toHaveBeenLastCalledWith(false)
  })

  test('둘 다 누르면 "둘 다", 한 명이면 그 사람 이모지 + 하트', () => {
    const { rerender } = render(<ItemCard {...base} item={item} hearts={[{ item_id: 'it', member: 'b' }]} />)
    expect(screen.getByRole('button', { name: '하트' })).toHaveTextContent(theme.emoji.b)
    rerender(<ItemCard {...base} item={item} hearts={[{ item_id: 'it', member: 'a' }, { item_id: 'it', member: 'b' }]} />)
    expect(screen.getByRole('button', { name: '하트' })).toHaveTextContent('둘 다 좋아해요')
  })

  test('댓글 개수 표시, 누르면 펼침', async () => {
    const comments = [1, 2].map((n) => ({ id: `c${n}`, item_id: 'it', member: 'b' as const, body: `댓글${n}`, created_at: `2026-11-14T0${n}:00:00Z` }))
    render(<ItemCard {...base} item={item} comments={comments} />)
    expect(screen.queryByText('댓글1')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: '댓글 2개' }))
    expect(screen.getByText('댓글1')).toBeInTheDocument()
  })

  test('오프라인이면 하트 막힘', () => {
    render(<ItemCard {...base} item={item} disabled />)
    expect(screen.getByRole('button', { name: '하트' })).toBeDisabled()
  })
})

describe('ItemCard', () => {
  test('비용: 현지통화 + 원화 환산', () => {
    render(<ItemCard {...base} item={makeItem({ cost_amount: 1200, cost_currency: 'JPY' })} />)
    expect(screen.getByText('¥1,200 (≈ ₩11,040)')).toBeInTheDocument()
  })

  test('비용: 환율 없으면 현지통화만, 원화 항목은 원화만', () => {
    const { rerender } = render(<ItemCard {...base} rate={null} item={makeItem({ cost_amount: 1200, cost_currency: 'JPY' })} />)
    expect(screen.getByText('¥1,200')).toBeInTheDocument()
    rerender(<ItemCard {...base} item={makeItem({ cost_amount: 5000, cost_currency: 'KRW' })} />)
    expect(screen.getByText('₩5,000')).toBeInTheDocument()
  })

  test('시간·장소·메모·작성자 표시, 시간 없으면 "시간 미정"', () => {
    render(<ItemCard {...base} item={makeItem({ place_name: '센소지', memo: '아침 일찍', created_by: 'b' })} />)
    expect(screen.getByText('센소지')).toBeInTheDocument()
    expect(screen.getByText('아침 일찍')).toBeInTheDocument()
    expect(screen.getByText('시간 미정')).toBeInTheDocument()
    expect(screen.getByLabelText(`작성: ${theme.names.b}`)).toBeInTheDocument()
  })

  test('http(s) 예약 링크만 링크로 보여줌', () => {
    const { rerender } = render(<ItemCard {...base} item={makeItem({ booking_url: 'https://booking.com/x' })} />)
    expect(screen.getByRole('link', { name: '예약 페이지' })).toHaveAttribute('href', 'https://booking.com/x')
    rerender(<ItemCard {...base} item={makeItem({ booking_url: 'javascript:alert(1)' })} />)
    expect(screen.queryByRole('link', { name: '예약 페이지' })).toBeNull()
  })

  test('위치가 있으면 "여기로 길찾기" 링크, 없으면 없음', () => {
    const it = makeItem({ lat: 35.7, lng: 139.8 })
    const { rerender } = render(<ItemCard {...base} item={it} />)
    expect(screen.getByRole('link', { name: '여기로 길찾기' })).toHaveAttribute('href', directionsUrl([it]))
    rerender(<ItemCard {...base} item={makeItem()} />)
    expect(screen.queryByRole('link', { name: '여기로 길찾기' })).toBeNull()
  })

  test('예약 번호 표시', () => {
    render(<ItemCard {...base} item={makeItem({ booking_code: 'ABC123' })} />)
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })
})

describe('ItemCard 바우처', () => {
  const item = makeItem({ id: 'it', place_name: '디즈니랜드' })
  const v = { id: 'v1', trip_id: 't', item_id: 'it', day: null, title: '입장권 QR', kind: 'image' as const, path: 'p', pages: [], size: 1, created_at: 'x' }

  test('붙은 바우처를 바로 열 수 있음', async () => {
    const onOpenVoucher = vi.fn()
    render(<ItemCard {...base} item={item} vouchers={[v]} onOpenVoucher={onOpenVoucher} />)
    await userEvent.click(screen.getByRole('button', { name: '입장권 QR 열기' }))
    expect(onOpenVoucher).toHaveBeenCalledWith(v)
  })

  test('이 일정에 바우처 올리기, 오프라인이면 막힘', async () => {
    const onAddVoucher = vi.fn()
    const { rerender } = render(<ItemCard {...base} item={item} onAddVoucher={onAddVoucher} />)
    const file = new File(['x'], 'qr.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('디즈니랜드에 바우처 올리기'), file)
    expect(onAddVoucher).toHaveBeenCalledWith(file)
    rerender(<ItemCard {...base} item={item} disabled onAddVoucher={onAddVoucher} />)
    expect(screen.getByLabelText('디즈니랜드에 바우처 올리기')).toBeDisabled()
  })
})
