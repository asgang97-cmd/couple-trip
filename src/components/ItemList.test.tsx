import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { LoadLeg } from '../hooks/useTightLegs'
import type { PlaceHours } from '../lib/hours'
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

describe('ItemList 영업시간 경고', () => {
  // 화요일 11:00–21:00만 영업
  const hours: PlaceHours = { regular: [{ open: { day: 2, hour: 11, minute: 0 }, close: { day: 2, hour: 21, minute: 0 } }], current: null }
  const TUE = '2027-01-12'
  const noLeg = vi.fn<LoadLeg>(async () => null)

  test('일정 시각에 아직 안 열었으면 그 카드 안에 경고', async () => {
    const it = makeItem({ day: TUE, time: '10:00', place_name: '이치란', google_place_id: 'p1', lat: 34.7, lng: 135.5 })
    render(<ItemList {...base} items={[it]} loadLeg={noLeg} loadHours={async () => hours} />)
    const note = await screen.findByText('⚠️ 10:00엔 아직 안 열어요 (11:00 오픈)')
    expect(note.closest('article')).toHaveTextContent('이치란')
  })

  test('같은 장소 두 일정: 한 번만 묻고, 문제 있는 카드에만 경고', async () => {
    const load = vi.fn(async () => hours)
    const early = makeItem({ day: TUE, time: '10:00', place_name: '아침', google_place_id: 'p1', lat: 34.7, lng: 135.5 })
    const noon = makeItem({ day: TUE, time: '12:00', place_name: '점심', google_place_id: 'p1', lat: 34.7, lng: 135.5 })
    render(<ItemList {...base} items={[early, noon]} loadLeg={noLeg} loadHours={load} />)
    const note = await screen.findByText(/아직 안 열어요/)
    expect(note.closest('article')).toHaveTextContent('아침')
    expect(screen.getAllByText(/⚠️/)).toHaveLength(1)
    expect(load).toHaveBeenCalledTimes(1)
  })

  test('며칠 전에 받은 7일치 특별 영업일은 그 7일에만 씀 (그 뒤 날짜는 매주 영업시간)', async () => {
    // 1/11(월)에 받음: current는 1/11~1/17만. 매일 11–21 영업. 오늘은 1/13
    const dated = (d: number, wd: number) => ({
      open: { day: wd, hour: 11, minute: 0, date: { year: 2027, month: 1, day: d } },
      close: { day: wd, hour: 21, minute: 0, date: { year: 2027, month: 1, day: d } },
    })
    const fetched: PlaceHours = {
      regular: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ open: { day: d, hour: 11, minute: 0 }, close: { day: d, hour: 21, minute: 0 } })),
      current: [11, 12, 13, 14, 15, 16, 17].map((d) => dated(d, (d - 10) % 7)),
      fetchedAt: new Date('2027-01-11T03:00:00Z').getTime(),
    }
    const it = makeItem({ day: '2027-01-18', time: null, place_name: '라멘', google_place_id: 'p1', lat: 34.7, lng: 135.5 })
    render(<ItemList {...base} trip={{ ...TRIP, timezone: 'Asia/Tokyo' }} now={new Date('2027-01-13T03:00:00Z')} items={[it]} loadLeg={noLeg} loadHours={async () => fetched} />)
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByText(/휴무/)).toBeNull()
  })

  test('장소 번호 없는 일정은 묻지 않음', async () => {
    const load = vi.fn(async () => hours)
    const it = makeItem({ day: TUE, time: '10:00', place_name: '직접 적은 곳' })
    render(<ItemList {...base} items={[it]} loadLeg={noLeg} loadHours={load} />)
    await new Promise((r) => setTimeout(r, 10))
    expect(load).not.toHaveBeenCalled()
    expect(screen.queryByText(/⚠️/)).toBeNull()
  })
})

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
