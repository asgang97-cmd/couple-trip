import { useState } from 'react'
import { formatMoney, toKrw } from '../lib/money'
import type { Comment, Heart, Item, Member, Trip } from '../lib/types'
import { theme } from '../theme'
import { CommentThread } from './CommentThread'

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
}

function heartLabel(hearts: Heart[]): string {
  if (hearts.length >= 2) return '💕'
  if (hearts.length === 1) return `${theme.emoji[hearts[0].member]}❤️`
  return '🤍'
}

const isWebUrl = (u: string) => /^https?:\/\//i.test(u)

function costLabel(amount: number, currency: string, rate: number | null): string {
  const local = formatMoney(amount, currency)
  if (currency === 'KRW') return local
  const krw = toKrw(amount, currency, rate)
  return krw === null ? local : `${local} (≈ ${formatMoney(krw, 'KRW')})`
}

export function ItemCard({ item, member, rate, hearts, comments, disabled, onEdit, onToggleHeart, onAddComment }: Props) {
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
      {(item.booking_code || isWebUrl(item.booking_url)) && (
        <div className="booking">
          {item.booking_code && (
            <button type="button" className="chip" onClick={copyCode} title="눌러서 복사">
              🎫 <span>{item.booking_code}</span>
            </button>
          )}
          {isWebUrl(item.booking_url) && (
            <a href={item.booking_url} target="_blank" rel="noopener noreferrer">예약 페이지</a>
          )}
        </div>
      )}
      <div className="card-actions">
        <button type="button" className="ghost" aria-label="하트" aria-pressed={mine} disabled={disabled} onClick={() => void onToggleHeart(!mine)}>
          {heartLabel(hearts)}
        </button>
        <button type="button" className="ghost" aria-expanded={showComments} onClick={() => setShowComments((v) => !v)}>
          💬 {comments.length}
        </button>
        <span className="spacer" />
        <button type="button" className="ghost" onClick={onEdit} disabled={disabled}>수정</button>
      </div>
      {showComments && <CommentThread comments={comments} member={member} disabled={disabled} onAdd={onAddComment} />}
    </article>
  )
}
