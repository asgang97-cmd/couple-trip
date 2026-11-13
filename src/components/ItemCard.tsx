import type { Item, Member, Trip } from '../lib/types'
import { theme } from '../theme'

interface Props {
  item: Item
  trip: Trip
  member: Member
  disabled: boolean
  onEdit: () => void
}

const isWebUrl = (u: string) => /^https?:\/\//i.test(u)

export function ItemCard({ item, disabled, onEdit }: Props) {
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
        <button type="button" className="ghost" onClick={onEdit} disabled={disabled}>수정</button>
      </div>
    </article>
  )
}
