import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { DayTabs } from './DayTabs'

const days = ['2027-01-12', '2027-01-13', '2027-01-14']

describe('DayTabs 날씨', () => {
  test('예보는 아이콘·기온, 작년은 따로 표시, 없는 날은 날씨 글 없음', () => {
    render(
      <DayTabs
        days={days}
        selected={days[0]}
        onSelect={() => {}}
        weather={{
          '2027-01-12': { code: 0, max: 12.4, min: 3.6, rain: 10, past: null },
          '2027-01-13': { code: 2, max: 11, min: 3, rain: null, past: '작년' },
        }}
      />,
    )
    const sunny = screen.getByText('☀️ 4°/12°')
    expect(sunny).toHaveAttribute('aria-label', '맑음 4도/12도')
    expect(sunny).not.toHaveClass('past')
    const past = screen.getByText('작년 ⛅ 3°/11°')
    expect(past).toHaveClass('tab-weather', 'past')
    expect(past).toHaveAttribute('aria-label', '작년 이맘때 구름 조금 3도/11도')
    const third = screen.getByRole('button', { name: /3일차/ })
    expect(third.querySelector('.tab-weather')).toBeNull()
  })

  test('날씨를 안 넘기면 예전처럼', () => {
    render(<DayTabs days={days} selected={days[0]} onSelect={() => {}} />)
    expect(document.querySelector('.tab-weather')).toBeNull()
  })
})
