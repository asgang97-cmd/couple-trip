import type { Comment, Heart, Item, Member, Trip, Voucher } from '../lib/types'
import { Mascot } from './Mascot'
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
  vouchers: Voucher[]
  onOpenVoucher: (v: Voucher) => void
  onAddVoucher: (itemId: string, file: File) => void
}

export function ItemList({ items, hearts, comments, vouchers, onAddVoucher, onEdit, onToggleHeart, onAddComment, ...rest }: Props) {
  if (items.length === 0) {
    return (
      <div className="empty-pond">
        <div className="pond-perch" aria-hidden="true">
          <Mascot slot="empty" size={88} />
        </div>
        <p className="empty-title">이 날은 아직 비어 있어요</p>
        <p className="empty">아래 일정 추가로 첫 일정을 넣어 보세요</p>
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
          vouchers={vouchers.filter((v) => v.item_id === it.id)}
          onAddVoucher={(file) => onAddVoucher(it.id, file)}
        />
      ))}
    </div>
  )
}
