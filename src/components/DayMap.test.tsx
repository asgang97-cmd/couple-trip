import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { directionsUrl } from '../lib/maps'
import { makeItem } from '../test-fixtures'

// 진짜 구글맵 대신 빈 껍데기
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="api">{children}</div>,
  Map: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  AdvancedMarker: ({ children, title }: { children: React.ReactNode; title: string }) => <div data-testid="marker" title={title}>{children}</div>,
  useMap: () => null,
}))
const { DayMap } = await import('./DayMap')

const located = [makeItem({ place_name: 'A', lat: 1, lng: 1 }), makeItem({ place_name: 'B', lat: 2, lng: 2 })]

describe('DayMap', () => {
  test('API 키가 없으면 안내', () => {
    render(<DayMap items={located} apiKey="" mapId="m" />)
    expect(screen.getByText('지도를 쓰려면 구글맵 API 키가 필요해요')).toBeInTheDocument()
    expect(screen.queryByTestId('map')).toBeNull()
  })

  test('위치 있는 항목이 없으면 안내, 지도·길찾기 없음', () => {
    render(<DayMap items={[makeItem()]} apiKey="k" mapId="m" />)
    expect(screen.getByText('일정에 장소를 검색해서 넣으면 지도에 보여요')).toBeInTheDocument()
    expect(screen.queryByTestId('map')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  test('위치 있는 항목마다 번호 핀 (위치 없는 건 빼고 순서대로)', () => {
    render(<DayMap items={[located[0], makeItem({ place_name: 'X' }), located[1]]} apiKey="k" mapId="m" />)
    const markers = screen.getAllByTestId('marker')
    expect(markers.map((m) => [m.title, m.textContent])).toEqual([['A', '1'], ['B', '2']])
  })

  test('기본은 도보: 구간마다 시간·거리', async () => {
    const loadLeg = vi.fn(async () => ({ path: [], durationSec: 720, distanceM: 900 }))
    render(<DayMap items={located} apiKey="k" mapId="m" loadLeg={loadLeg} />)
    expect(await screen.findByText('① → ② 도보 12분, 900m')).toBeInTheDocument()
    expect(loadLeg).toHaveBeenCalledWith({ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, 'walk', undefined)
  })

  test('대중교통으로 바꾸면 다시 계산 (출발 시각 = 앞 장소의 일정 시각)', async () => {
    const loadLeg = vi.fn(async () => ({ path: [], durationSec: 3900, distanceM: 12300 }))
    const items = [makeItem({ lat: 1, lng: 1, time: '09:30', day: '2026-11-16' }), makeItem({ lat: 2, lng: 2 })]
    render(<DayMap items={items} apiKey="k" mapId="m" loadLeg={loadLeg} now={new Date(2026, 10, 14, 12, 0)} />)
    await userEvent.click(screen.getByRole('button', { name: '대중교통' }))
    expect(await screen.findByText('① → ② 대중교통 1시간 5분, 12.3km')).toBeInTheDocument()
    expect(loadLeg).toHaveBeenLastCalledWith({ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, 'transit', new Date(2026, 10, 16, 9, 30).toISOString())
  })

  test('경로를 못 구하면 안내', async () => {
    render(<DayMap items={located} apiKey="k" mapId="m" loadLeg={async () => null} />)
    expect(await screen.findByText('① → ② 길을 못 찾아서 직선으로 표시')).toBeInTheDocument()
  })

  test('걸어서·대중교통 길찾기 링크', () => {
    render(<DayMap items={located} apiKey="k" mapId="m" />)
    expect(screen.getByRole('link', { name: '걸어서 길찾기' })).toHaveAttribute('href', directionsUrl(located, 'walking'))
    expect(screen.getByRole('link', { name: '대중교통 길찾기' })).toHaveAttribute('href', directionsUrl(located, 'transit'))
  })
})
