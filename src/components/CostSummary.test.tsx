import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { TRIP, makeItem } from '../test-fixtures'
import { CostSummary } from './CostSummary'

const live = { rate: 9, source: 'live' as const, fetchedAt: '2027-01-05T03:00:00.000Z' }

describe('CostSummary', () => {
  const day = [makeItem({ cost_amount: 1000, cost_currency: 'JPY' }), makeItem({ cost_amount: 5000, cost_currency: 'KRW' })]
  const all = [...day, makeItem({ day: '2027-01-11', cost_amount: 2000, cost_currency: 'JPY' })]

  test('오늘 합계와 전체 합계를 원화로', () => {
    render(<CostSummary dayItems={day} allItems={all} trip={TRIP} rate={live} />)
    expect(screen.getByText('₩14,000')).toBeInTheDocument()
    expect(screen.getByText('₩32,000')).toBeInTheDocument()
  })

  test('저장된 환율이면 알려줌', () => {
    render(<CostSummary dayItems={day} allItems={all} trip={TRIP} rate={{ ...live, source: 'cached' }} />)
    expect(screen.getByText(/저장된 환율 기준/)).toBeInTheDocument()
  })

  test('환율 없으면 원화 항목만 합산 + 몇 개 빠졌는지', () => {
    render(<CostSummary dayItems={day} allItems={all} trip={TRIP} rate={{ rate: null, source: 'none', fetchedAt: null }} />)
    expect(screen.getAllByText('₩5,000')).toHaveLength(2)
    expect(screen.getByText('환율을 못 불러와서 2개는 현지통화로만 보여요')).toBeInTheDocument()
  })

  test('비용이 하나도 없으면 아무것도 안 보임', () => {
    const { container } = render(<CostSummary dayItems={[makeItem()]} allItems={[makeItem()]} trip={TRIP} rate={live} />)
    expect(container).toBeEmptyDOMElement()
  })

  test('직접 넣은 환율은 메인 화면에 줄을 따로 쓰지 않음 (한 줄 유지)', () => {
    render(<CostSummary dayItems={day} allItems={all} trip={TRIP} rate={{ rate: 9.1, source: 'manual', fetchedAt: null }} />)
    expect(screen.queryByText(/직접 넣은 환율/)).toBeNull()
  })
})
