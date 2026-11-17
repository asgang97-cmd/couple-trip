import { parseLocalDate } from '../lib/dates'
import { weatherSpeech, weatherText, type TabWeather } from '../lib/weather'
import { Mascot } from './Mascot'

const fmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })

export function DayTabs({ days, selected, onSelect, weather = {} }: {
  days: string[]
  selected: string
  onSelect: (d: string) => void
  weather?: Record<string, TabWeather> // 날짜별 날씨 (예보, 없으면 작년 이맘때)
}) {
  return (
    <nav className="day-tabs" aria-label="날짜">
      {days.map((d, i) => (
        <button
          key={d}
          type="button"
          className={d === selected ? 'tab active' : 'tab'}
          aria-pressed={d === selected}
          onClick={() => onSelect(d)}
        >
          {/* 선택한 날 알약 안 왼쪽에 우리 캐릭터. key가 바뀌면 새로 그려져 폴짝 */}
          {d === selected && <Mascot key={d} slot="day" size={32} className="tab-mascot" />}
          <span className="tab-text">
            <strong>{i + 1}일차</strong>
            <small>{fmt.format(parseLocalDate(d))}</small>
            {weather[d] && (
              <small className={weather[d].past ? 'tab-weather past' : 'tab-weather'} aria-label={weatherSpeech(weather[d])}>
                {weatherText(weather[d])}
              </small>
            )}
          </span>
        </button>
      ))}
    </nav>
  )
}
