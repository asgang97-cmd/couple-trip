import { tripPhaseLabel } from '../lib/dates'
import type { Trip } from '../lib/types'
import { theme } from '../theme'
import { Mascot } from './Mascot'
import { Icon } from './Icon'

interface Props {
  trip: Trip
  coverUrl: string | null // 앱에서 올린 사진(서명된 주소). 없으면 fallbackPhoto
  /** 올린 사진이 없을 때 쓸 public 폴더 사진. 기본값 theme.coverPhoto (null이면 그라데이션만) */
  fallbackPhoto?: string | null
  now: Date
  uploading: boolean
  disabled: boolean
  onPickPhoto: (file: File) => void
  onOpenSettings: () => void
  /** 비짓재팬 준비 (폰에 저장된 정보라 오프라인에서도 열림) */
  onOpenVisitJapan: () => void
}

export function HomeHeader({ trip, coverUrl, fallbackPhoto = theme.coverPhoto, now, uploading, disabled, onPickPhoto, onOpenSettings, onOpenVisitJapan }: Props) {
  const photo = coverUrl ?? fallbackPhoto
  const layers = [
    'linear-gradient(transparent 25%, var(--color-scrim))',
    ...(photo ? [`url("${photo}")`] : []),
    'linear-gradient(160deg, var(--color-pond), var(--color-accent))',
  ]
  return (
    <header
      className="cover"
      data-testid="cover"
      // 사진이 없거나 못 불러오면 아래 그라데이션이 보임
      style={{ backgroundImage: layers.join(', ') }}
    >
      <div className="cover-actions">
        <button type="button" className="photo-btn" aria-label="비짓재팬 준비" onClick={onOpenVisitJapan}><Icon name="plane" /></button>
        <button type="button" className="photo-btn" aria-label="여행 설정" disabled={disabled} onClick={onOpenSettings}><Icon name="gear" /></button>
        <label className={`photo-btn${uploading || disabled ? ' off' : ''}`}>
          {uploading ? '올리는 중…' : <Icon name="camera" />}
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
      </div>
      <div className="cover-text">
        <p className="greeting">{theme.greeting}</p>
        <p className="dday">{tripPhaseLabel(trip.start_date, trip.end_date, now)}</p>
        <h1>{trip.title}</h1>
      </div>
      {/* 우리 둘 (캐릭터 커플) */}
      <div className="cover-frogs" aria-hidden="true">
        <Mascot slot="coverA" size={72} />
        <Mascot slot="coverB" size={64} />
      </div>
    </header>
  )
}
