import { parseLocalDate } from '../lib/dates'
import { Frog } from './Frog'

const fmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })

export function DayTabs({ days, selected, onSelect }: { days: string[]; selected: string; onSelect: (d: string) => void }) {
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
          {/* 선택한 날 연잎 위에 개구리. key가 바뀌면 새로 그려져 폴짝 뛰어옴 */}
          {d === selected && <Frog key={d} size={40} className="tab-frog" />}
          <strong>{i + 1}일차</strong>
          <small>{fmt.format(parseLocalDate(d))}</small>
        </button>
      ))}
    </nav>
  )
}
