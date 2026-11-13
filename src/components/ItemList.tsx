import type { Comment, Heart, Item, Member, Trip } from '../lib/types'
import { ItemCard } from './ItemCard'

interface Props {
  items: Item[]
  trip: Trip
  member: Member
  rate: number | null
  hearts: Heart[]
  comments: Comment[]
  disabled: boolean
  onEdit: (item: Item) => void
  onToggleHeart: (itemId: string, on: boolean) => Promise<void>
  onAddComment: (itemId: string, body: string) => Promise<void>
}

export function ItemList({ items, hearts, comments, onEdit, onToggleHeart, onAddComment, ...rest }: Props) {
  if (items.length === 0) return <p className="empty">아직 일정이 없어요. 아래에서 추가해 보세요 ✨</p>
  return (
    <div className="item-list">
      {items.map((it) => (
        <ItemCard
          key={it.id}
          item={it}
          {...rest}
          hearts={hearts.filter((h) => h.item_id === it.id)}
          comments={comments.filter((c) => c.item_id === it.id)}
          onEdit={() => onEdit(it)}
          onToggleHeart={(on) => onToggleHeart(it.id, on)}
          onAddComment={(body) => onAddComment(it.id, body)}
        />
      ))}
    </div>
  )
}
