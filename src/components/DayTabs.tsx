import { parseLocalDate } from '../lib/dates'

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
          <strong>{i + 1}일차</strong>
          <small>{fmt.format(parseLocalDate(d))}</small>
        </button>
      ))}
    </nav>
  )
}
