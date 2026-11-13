import { render, screen } from '@testing-library/react'
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

  test('걸어서·대중교통 길찾기 링크', () => {
    render(<DayMap items={located} apiKey="k" mapId="m" />)
    expect(screen.getByRole('link', { name: '🚶 걸어서 길찾기' })).toHaveAttribute('href', directionsUrl(located, 'walking'))
    expect(screen.getByRole('link', { name: '🚇 대중교통 길찾기' })).toHaveAttribute('href', directionsUrl(located, 'transit'))
  })
})
