import type { Item, Member, Trip } from '../lib/types'
import { ItemCard } from './ItemCard'

interface Props {
  items: Item[]
  trip: Trip
  member: Member
  disabled: boolean
  onEdit: (item: Item) => void
}

export function ItemList({ items, trip, member, disabled, onEdit }: Props) {
  if (items.length === 0) return <p className="empty">아직 일정이 없어요. 아래에서 추가해 보세요 ✨</p>
  return (
    <div className="item-list">
      {items.map((it) => (
        <ItemCard key={it.id} item={it} trip={trip} member={member} disabled={disabled} onEdit={() => onEdit(it)} />
      ))}
    </div>
  )
}
