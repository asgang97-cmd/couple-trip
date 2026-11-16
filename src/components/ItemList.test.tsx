import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { LoadLeg } from '../hooks/useTightLegs'
import { TRIP, makeItem } from '../test-fixtures'
import { ItemList } from './ItemList'

const base = {
  trip: TRIP, member: 'a' as const, rate: 9.2, disabled: false, onEdit: () => {},
  hearts: [], comments: [], onToggleHeart: async () => {}, onAddComment: async () => {},
  onEditComment: async () => {}, onDeleteComment: async () => {},
  vouchers: [], onOpenVoucher: () => {}, onAddVoucher: () => {},
  apiKey: 'key', now: new Date('2027-01-08T00:00:00Z'),
}
const loader = (walk: number | null, transit: number | null) =>
  vi.fn<LoadLeg>(async (_a, _b, mode) => {
    const s = mode === 'walk' ? walk : transit
    return s === null ? null : { path: [], durationSec: s, distanceM: 1000 }
  })
const cafe = makeItem({ time: '11:00', place_name: '카페', lat: 34.7, lng: 135.5 })
const ramen = makeItem({ time: '11:20', place_name: '라멘집', lat: 34.8, lng: 135.5 })

describe('ItemList 빠듯한 일정 경고', () => {
  test('두 카드 사이에 경고 두 줄 (빠른 쪽 시간, 수단별 시간)', async () => {
    render(<ItemList {...base} items={[cafe, ramen]} loadLeg={loader(2520, 2100)} />)
    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent('⚠️ 20분 뒤 다음 일정인데 이동이 35분 걸려요')
    expect(note).toHaveTextContent('(대중교통 35분 · 도보 42분)')
    // 순서: 카페 카드 → 경고 → 라멘집 카드
    const first = screen.getByText('카페')
    const second = screen.getByText('라멘집')
    expect(first.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(note.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('대중교통을 못 구하면 도보만 표시', async () => {
    render(<ItemList {...base} items={[cafe, ramen]} loadLeg={loader(2520, null)} />)
    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent('이동이 42분 걸려요')
    expect(note).toHaveTextContent('(도보 42분)')
    expect(note).not.toHaveTextContent('대중교통')
  })

  test('여유 있으면 경고 없음', async () => {
    const load = loader(600, 900)
    render(<ItemList {...base} items={[cafe, ramen]} loadLeg={load} />)
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('note')).toBeNull()
    expect(screen.queryByText(/⚠️/)).toBeNull()
  })
})
