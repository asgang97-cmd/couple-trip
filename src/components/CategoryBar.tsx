// 목록 위 종류 버튼 줄: 전체(날짜별) 또는 한 종류(여행 전체에서 모아 보기)
import { CATEGORIES, type Category } from '../lib/category'

interface Props {
  value: Category | null
  onChange: (c: Category | null) => void
}

export function CategoryBar({ value, onChange }: Props) {
  return (
    <div className="cat-pick cat-bar" role="group" aria-label="종류별로 보기">
      <button type="button" aria-pressed={value === null} onClick={() => onChange(null)}>전체</button>
      {CATEGORIES.map((c) => (
        <button key={c.value} type="button" aria-pressed={value === c.value} onClick={() => onChange(c.value)}>
          {c.icon} {c.label}
        </button>
      ))}
    </div>
  )
}
