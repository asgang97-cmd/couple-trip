import { useState } from 'react'
import { tripPhaseLabel } from '../lib/dates'
import type { Trip } from '../lib/types'
import { theme } from '../theme'

interface Props {
  trip: Trip
  coverUrl: string | null // 앱에서 올린 사진(서명된 주소). 없으면 fallbackPhoto
  /** 올린 사진이 없을 때 쓸 public 폴더 사진. 기본값 theme.coverPhoto (null이면 그라데이션만) */
  fallbackPhoto?: string | null
  now?: Date
  uploading: boolean
  disabled: boolean
  onPickPhoto: (file: File) => void
}

export function HomeHeader({ trip, coverUrl, fallbackPhoto = theme.coverPhoto, now, uploading, disabled, onPickPhoto }: Props) {
  const [openedAt] = useState(() => new Date()) // 화면을 연 시각 (D-day 계산용)
  const photo = coverUrl ?? fallbackPhoto
  const layers = [
    'linear-gradient(transparent 30%, rgba(0,0,0,0.55))',
    ...(photo ? [`url("${photo}")`] : []),
    'linear-gradient(135deg, var(--primary), #ffb3c1)',
  ]
  return (
    <header
      className="cover"
      data-testid="cover"
      // 사진이 없거나 못 불러오면 아래 그라데이션이 보임
      style={{ backgroundImage: layers.join(', ') }}
    >
      <label className={`photo-btn${uploading || disabled ? ' off' : ''}`}>
        {uploading ? '올리는 중…' : '📷'}
        <input
          type="file"
          accept="image/*"
          aria-label="사진 바꾸기"
          disabled={uploading || disabled}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onPickPhoto(f)
            e.target.value = '' // 같은 사진을 다시 골라도 동작하게
          }}
        />
      </label>
      <div className="cover-text">
        <p className="greeting">{theme.greeting}</p>
        <p className="dday">{tripPhaseLabel(trip.start_date, trip.end_date, now ?? openedAt)}</p>
        <h1>{trip.title}</h1>
      </div>
    </header>
  )
}
