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

describe('ItemCard 종류 아이콘', () => {
  const CAT_NAME = /^(숙소|교통|식사|관광|쇼핑|기타)$/

  test('종류가 있으면 아이콘, 읽는 이름은 종류 이름', () => {
    render(<ItemCard {...base} item={makeItem({ category: 'food' })} />)
    expect(screen.getByRole('img', { name: '식사' })).toHaveTextContent('🍜')
  })

  test('종류 없거나 칸 없으면 아이콘 없음', () => {
    const { unmount } = render(<ItemCard {...base} item={makeItem({ category: null })} />)
    expect(screen.queryByRole('img', { name: CAT_NAME })).toBeNull()
    unmount()
    const old = makeItem()
    delete (old as { category?: unknown }).category
    render(<ItemCard {...base} item={old} />)
    expect(screen.queryByRole('img', { name: CAT_NAME })).toBeNull()
  })
})

describe('ItemCard 한 줄로 접힌 모양 (compact)', () => {
  const item = makeItem({ time: '19:00', place_name: '스시 오마카세', memo: '10분 전 도착', booking_code: 'TBL-2291' })
  test('처음엔 시간·장소·한 줄 요약만, 메모·수정은 안 보임', () => {
    render(<ItemCard {...base} item={item} compact comments={[{ id: 'c', item_id: item.id, member: 'b', body: 'hi', created_at: '' }]} hearts={[{ item_id: item.id, member: 'a' }]} />)
    expect(screen.getByRole('heading', { name: '스시 오마카세' })).toBeInTheDocument()
    expect(screen.getByText('TBL-2291 · 하트 1 · 댓글 1')).toBeInTheDocument()
    expect(screen.queryByText('10분 전 도착')).toBeNull()
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull()
  })
  test('장소를 누르면 펼쳐져 전부 보임, 다시 누르면 접힘', async () => {
    render(<ItemCard {...base} item={item} compact />)
    const toggle = screen.getByRole('button', { name: '스시 오마카세' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('10분 전 도착')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument()
    await userEvent.click(toggle)
    expect(screen.queryByText('10분 전 도착')).toBeNull()
  })
  test('영업시간 경고는 접혀 있어도 보임', () => {
    render(<ItemCard {...base} item={item} compact hoursWarning={{ kind: 'closedDay' } as never} />)
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})
