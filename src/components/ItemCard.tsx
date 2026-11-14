import { useState } from 'react'
import { directionsUrl } from '../lib/maps'
import { formatMoney, toKrw } from '../lib/money'
import type { Comment, Heart, Item, Member, Trip, Voucher } from '../lib/types'
import { theme } from '../theme'
import { CommentThread } from './CommentThread'
import { Icon } from './Icon'

interface Props {
  item: Item
  trip: Trip
  member: Member
  rate: number | null
  hearts: Heart[] // 이 항목의 하트만
  comments: Comment[] // 이 항목의 댓글만
  disabled: boolean
  onEdit: () => void
  onToggleHeart: (on: boolean) => Promise<void>
  onAddComment: (body: string) => Promise<void>
  onEditComment: (id: string, body: string) => Promise<void>
  onDeleteComment: (id: string) => Promise<void>
  vouchers: Voucher[] // 이 일정에 붙은 바우처
  onOpenVoucher: (v: Voucher) => void
  onAddVoucher: (file: File) => void
}

/** 하트: 둘 다 → 하트 두 개, 한 명 → 그 사람 이모지 + 하트, 없음 → 빈 하트 */
function HeartLabel({ hearts }: { hearts: Heart[] }) {
  if (hearts.length >= 2) {
    return (
      <span className="hearts both">
        <Icon name="heart" filled />
        <Icon name="heart" filled />
        <span className="visually-hidden">둘 다 좋아해요</span>
      </span>
    )
  }
  if (hearts.length === 1) {
    return (
      <span className="hearts">
        {theme.emoji[hearts[0].member]}
        <Icon name="heart" filled />
      </span>
    )
  }
  return (
    <span className="hearts">
      <Icon name="heart" />
    </span>
  )
}

const isWebUrl = (u: string) => /^https?:\/\//i.test(u)

function costLabel(amount: number, currency: string, rate: number | null): string {
  const local = formatMoney(amount, currency)
  if (currency === 'KRW') return local
  const krw = toKrw(amount, currency, rate)
  return krw === null ? local : `${local} (≈ ${formatMoney(krw, 'KRW')})`
}

export function ItemCard({
  item, member, rate, hearts, comments, disabled, onEdit, onToggleHeart, onAddComment, onEditComment, onDeleteComment,
  vouchers, onOpenVoucher, onAddVoucher,
}: Props) {
  const [showComments, setShowComments] = useState(false)
  const mine = hearts.some((h) => h.member === member)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(item.booking_code)
    } catch {
      // 복사가 막힌 브라우저면 길게 눌러 복사
    }
  }

  return (
    <article className="card">
      <div className="card-head">
        <span className="time">{item.time ?? '시간 미정'}</span>
        <span aria-label={`작성: ${theme.names[item.created_by]}`}>{theme.emoji[item.created_by]}</span>
      </div>
      <h3>{item.place_name}</h3>
      {item.memo && <p className="memo">{item.memo}</p>}
      {item.cost_amount !== null && <p className="cost">{costLabel(item.cost_amount, item.cost_currency, rate)}</p>}
      {item.lat !== null && item.lng !== null && (
        <a className="go-link" href={directionsUrl([item])!} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={16} />여기로 길찾기</a>
      )}
      {(item.booking_code || isWebUrl(item.booking_url)) && (
        <div className="booking">
          {item.booking_code && (
            <button type="button" className="chip" onClick={copyCode} title="눌러서 복사">
              <Icon name="ticket" size={16} /><span>{item.booking_code}</span>
            </button>
          )}
          {isWebUrl(item.booking_url) && (
            <a href={item.booking_url} target="_blank" rel="noopener noreferrer">예약 페이지</a>
          )}
        </div>
      )}
      <div className="card-vouchers">
        {vouchers.map((v) => (
          <button key={v.id} type="button" className="chip voucher-chip" aria-label={`${v.title} 열기`} onClick={() => onOpenVoucher(v)}>
            <Icon name="ticket" size={16} />
            <span>{v.title}</span>
          </button>
        ))}
        <label className={`chip voucher-add${disabled ? ' off' : ''}`}>
          <Icon name="plus" size={16} />
          바우처
          <input
            type="file"
            accept="image/*,application/pdf,.pdf"
            aria-label={`${item.place_name}에 바우처 올리기`}
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onAddVoucher(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      <div className="card-actions">
        <button type="button" className="ghost" aria-label="하트" aria-pressed={mine} disabled={disabled} onClick={() => void onToggleHeart(!mine)}>
          <HeartLabel hearts={hearts} />
        </button>
        <button type="button" className="ghost" aria-label={`댓글 ${comments.length}개`} aria-expanded={showComments} onClick={() => setShowComments((v) => !v)}>
          <Icon name="chat" /> {comments.length}
        </button>
        <span className="spacer" />
        <button type="button" className="ghost" onClick={onEdit} disabled={disabled}>수정</button>
      </div>
      {showComments && (
        <CommentThread
          comments={comments}
          member={member}
          disabled={disabled}
          onAdd={onAddComment}
          onEdit={onEditComment}
          onDelete={onDeleteComment}
        />
      )}
    </article>
  )
}
