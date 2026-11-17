import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { LoadLeg } from '../hooks/useTightLegs'
import { TRIP, makeItem } from '../test-fixtures'
import { CategoryList } from './CategoryList'

const DAYS = ['2027-01-10', '2027-01-11', '2027-01-12']
const fmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })
const dayText = (d: string) => fmt.format(new Date(`${d}T00:00:00`))
// 어느 두 곳이든 3시간 걸린다고 답함 → 날짜별 화면이었다면 경고가 났을 것
const slow = vi.fn<LoadLeg>(async () => ({ path: [], durationSec: 3 * 3600, distanceM: 9000 }))
const base = {
  trip: TRIP, member: 'a' as const, rate: 9.2, disabled: false, onEdit: () => {},
  hearts: [], comments: [], onToggleHeart: async () => {}, onAddComment: async () => {},
  onEditComment: async () => {}, onDeleteComment: async () => {},
  vouchers: [], onOpenVoucher: () => {}, onAddVoucher: () => {},
  days: DAYS, apiKey: 'key', now: new Date('2027-01-08T00:00:00Z'), loadLeg: slow, loadHours: async () => null,
}

describe('CategoryList (여행 전체에서 한 종류)', () => {
  test('여행 기간 안 그 종류만, 날짜 제목과 함께 날짜순', () => {
    const items = [
      makeItem({ day: '2027-01-12', time: '12:00', place_name: '규카츠', category: 'food' }),
      makeItem({ day: '2027-01-11', place_name: '호텔', category: 'stay' }),
      makeItem({ day: '2027-01-10', time: '19:00', place_name: '스시', category: 'food' }),
      makeItem({ day: '2027-01-10', time: '12:00', place_name: '이치란', category: 'food' }),
      makeItem({ day: '2027-01-20', place_name: '기간 밖', category: 'food' }),
    ]
    render(<CategoryList {...base} category="food" items={items} />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      `1일차 · ${dayText('2027-01-10')}`, '이치란', '스시',
      `3일차 · ${dayText('2027-01-12')}`, '규카츠',
    ])
  })

  test('기타는 종류 없는 일정 포함', () => {
    const items = [makeItem({ place_name: '메모', category: null }), makeItem({ place_name: '기타', category: 'etc' }), makeItem({ place_name: '밥', category: 'food' })]
    render(<CategoryList {...base} category="etc" items={items} />)
    expect(screen.getByText('메모')).toBeInTheDocument()
    expect(screen.getByText('기타')).toBeInTheDocument()
    expect(screen.queryByText('밥')).toBeNull()
  })

  test('없으면 안내 문구', () => {
    render(<CategoryList {...base} category="food" items={[makeItem({ category: 'stay' })]} />)
    expect(screen.getByText('아직 식사 일정이 없어요')).toBeInTheDocument()
  })

  test('날짜 사이 빠듯한 일정 경고 없음', async () => {
    const items = [
      makeItem({ day: '2027-01-10', time: '12:00', place_name: 'A', category: 'food', lat: 34.7, lng: 135.5 }),
      makeItem({ day: '2027-01-10', time: '12:30', place_name: 'B', category: 'food', lat: 35.0, lng: 135.7 }),
    ]
    const { container } = render(<CategoryList {...base} category="food" items={items} />)
    await new Promise((r) => setTimeout(r, 30))
    expect(slow).not.toHaveBeenCalled()
    expect(container.querySelector('.tight-warning')).toBeNull()
  })
})
