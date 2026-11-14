import type { Comment, Heart, Item, Member, Trip } from '../lib/types'
import { Frog, LilyPad } from './Frog'
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
  onEditComment: (id: string, body: string) => Promise<void>
  onDeleteComment: (id: string) => Promise<void>
}

export function ItemList({ items, hearts, comments, onEdit, onToggleHeart, onAddComment, ...rest }: Props) {
  if (items.length === 0) {
    return (
      <div className="empty-pond">
        <div className="pond-perch" aria-hidden="true">
          <Frog size={88} />
          <LilyPad size={150} />
        </div>
        <p className="empty-title">이 날은 아직 비어 있어요</p>
        <p className="empty">아래 일정 추가로 첫 연잎을 띄워 보세요</p>
      </div>
    )
  }
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
