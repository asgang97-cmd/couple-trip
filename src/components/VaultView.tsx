import { parseLocalDate } from '../lib/dates'
import type { Item, Voucher } from '../lib/types'
import { Mascot, Seat } from './Mascot'
import { Icon } from './Icon'

interface Props {
  vouchers: Voucher[]
  items: Item[]
  days: string[]
  disabled: boolean // 오프라인이면 올리기·수정 막힘 (열기는 됨)
  loadError: boolean
  isSaved: (id: string) => boolean
  onPick: (file: File) => void
  onOpen: (v: Voucher) => void
  onEdit: (v: Voucher) => void
}

const fmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })

/** 보관함: 날짜별로 모은 예약 확인서·QR·바우처 */
export function VaultView({ vouchers, items, days, disabled, loadError, isSaved, onPick, onOpen, onEdit }: Props) {
  const byDay = new Map<string, Voucher[]>()
  for (const v of vouchers) {
    const key = v.day && days.includes(v.day) ? v.day : ''
    byDay.set(key, [...(byDay.get(key) ?? []), v])
  }
  const groups = [
    ...days.filter((d) => byDay.has(d)).map((d) => ({ key: d, title: `${days.indexOf(d) + 1}일차, ${fmt.format(parseLocalDate(d))}` })),
    ...(byDay.has('') ? [{ key: '', title: '날짜 없음' }] : []),
  ]
  const placeOf = (v: Voucher) => items.find((i) => i.id === v.item_id)?.place_name

  return (
    <section className="vault" aria-label="보관함">
      <div className="vault-head">
        <p className="note">예약 확인서, QR, 바우처를 모아 두면 인터넷이 없어도 열려요</p>
        <label className={`vault-upload${disabled ? ' off' : ''}`}>
          <Icon name="plus" size={18} />
          올리기
          <input
            type="file"
            accept="image/*,application/pdf,.pdf"
            aria-label="바우처 올리기"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onPick(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {loadError && <p className="error">보관함 목록을 불러오지 못했어요. 폰에 있는 것만 보여요</p>}

      {vouchers.length === 0 ? (
        <div className="empty-pond">
          <div className="pond-perch" aria-hidden="true">
            <Mascot size={80} />
            <Seat size={140} />
          </div>
          <p className="empty-title">아직 모아 둔 바우처가 없어요</p>
          <p className="empty">PDF를 올리면 예약번호와 날짜를 읽어서 일정에 붙여 줘요</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key || 'none'} className="vault-group">
            <h3>{g.title}</h3>
            <ul>
              {byDay.get(g.key)!.map((v) => (
                <li key={v.id} aria-label={v.title}>
                  <button type="button" className="vault-open" aria-label={`${v.title} 열기`} onClick={() => onOpen(v)}>
                    <span className="vault-kind" aria-hidden="true"><Icon name={v.kind === 'pdf' ? 'ticket' : 'camera'} /></span>
                    <span className="vault-text">
                      <span className="vault-title">{v.title}</span>
                      <span className="vault-meta">
                        {placeOf(v) && <span>{placeOf(v)}</span>}
                        <span>{v.kind === 'pdf' ? `PDF ${v.pages.length}쪽` : '사진'}</span>
                      </span>
                    </span>
                  </button>
                  <span className={isSaved(v.id) ? 'vault-saved' : 'vault-saved not'}>{isSaved(v.id) ? '폰에 저장됨' : '아직 폰에 없음'}</span>
                  <button type="button" className="vault-edit" aria-label={`${v.title} 수정`} disabled={disabled} onClick={() => onEdit(v)}>
                    <Icon name="pencil" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  )
}
