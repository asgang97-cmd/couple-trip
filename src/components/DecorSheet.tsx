import { useState } from 'react'
import { DECOR_SLOTS, type DecorSlot } from '../lib/decor'
import { theme } from '../theme'
import { useDecor } from './DecorContext'

interface Props {
  disabled: boolean // 오프라인이면 바꾸기 막힘
  /** 실패하면 throw (알림은 부르는 쪽에서) */
  onPick: (slot: DecorSlot, file: File) => Promise<void>
  onRemove: (slot: DecorSlot) => Promise<void>
  onClose: () => void
}

/** 캐릭터·배경 꾸미기: 자리마다 사진 고르기 / 빼기 */
export function DecorSheet({ disabled, onPick, onRemove, onClose }: Props) {
  const urls = useDecor()
  const [busy, setBusy] = useState<DecorSlot | null>(null)

  async function run(slot: DecorSlot, task: () => Promise<void>) {
    setBusy(slot)
    try {
      await task()
    } catch {
      // 부르는 쪽에서 알림
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={busy ? undefined : onClose}>
      <div className="sheet stack" role="dialog" aria-label="캐릭터·배경 꾸미기" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>캐릭터·배경 꾸미기</h2>
          <button type="button" className="ghost" onClick={onClose} disabled={busy !== null}>닫기</button>
        </div>
        <p className="note">넣은 사진은 {theme.names.b} 폰에도 같이 보여요. 배경이 투명한 PNG는 그대로, 일반 사진은 동그랗게 보여요</p>
        <ul className="decor-list">
          {DECOR_SLOTS.map(({ slot, label }) => {
            const item = urls[slot]
            return (
              <li key={slot}>
                <span className={`decor-thumb${slot === 'background' ? ' wide' : ''}`}>
                  {item ? <img src={item.url} alt={label} className={item.round ? 'round' : ''} /> : <span className="decor-empty">비어 있음</span>}
                </span>
                <span className="decor-label">{busy === slot ? '올리는 중…' : label}</span>
                <label className={`decor-pick${disabled || busy ? ' off' : ''}`}>
                  사진 고르기
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={`${label} 고르기`}
                    disabled={disabled || busy !== null}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) void run(slot, () => onPick(slot, f))
                    }}
                  />
                </label>
                {item && (
                  <button
                    type="button"
                    className="ghost decor-remove"
                    aria-label={`${label} 빼기`}
                    disabled={disabled || busy !== null}
                    onClick={() => {
                      if (confirm(`${label} 사진을 뺄까요?`)) void run(slot, () => onRemove(slot))
                    }}
                  >
                    빼기
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
