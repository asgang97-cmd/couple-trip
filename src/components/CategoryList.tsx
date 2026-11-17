// 종류별 모아 보기: 여행 전체에서 한 종류만, 날짜마다 작은 제목
import { Fragment } from 'react'
import { categoryInfo, itemsOfCategory, type Category } from '../lib/category'
import { groupItemsByDay, parseLocalDate } from '../lib/dates'
import type { Item } from '../lib/types'
import { ItemList, type ItemListProps } from './ItemList'

const dayFmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })

interface Props extends Omit<ItemListProps, 'items' | 'tight'> {
  category: Category
  /** 여행 전체 일정 (기간 밖 일정은 여기서 뺌) */
  items: Item[]
  days: string[]
}

export function CategoryList({ category, items, days, ...rest }: Props) {
  const byDay = groupItemsByDay(itemsOfCategory(items, category), days) // 기간 밖은 groupItemsByDay가 뺌
  const shown = days.filter((d) => byDay[d].length > 0)
  if (shown.length === 0) return <p className="empty">아직 {categoryInfo(category)!.label} 일정이 없어요</p>
  return (
    <div className="cat-list">
      {shown.map((d) => (
        <Fragment key={d}>
          <h3 className="cat-day">{days.indexOf(d) + 1}일차 · {dayFmt.format(parseLocalDate(d))}</h3>
          <ItemList {...rest} items={byDay[d]} tight={false} />
        </Fragment>
      ))}
    </div>
  )
}
