// 우리 개구리 🐸 (새로 그린 오리지널 캐릭터). 색은 tokens.css의 --color-frog-* 를 따라감.

interface Props {
  /** 가로 크기(px) */
  size?: number
  /** 'sit' 앉은 모습 · 'peek' 눈만 빼꼼 (커버 아래 끝용) */
  pose?: 'sit' | 'peek'
  className?: string
  /** 머리 위 분홍 리본 (커플 중 한 명) */
  bow?: boolean
}

export function Frog({ size = 96, pose = 'sit', className, bow = false }: Props) {
  const peek = pose === 'peek'
  return (
    <svg
      className={['frog', className].filter(Boolean).join(' ')}
      width={size}
      height={size * (peek ? 0.67 : 0.86)}
      viewBox={peek ? '0 0 120 80' : '0 0 120 103'}
      aria-hidden="true"
      focusable="false"
    >
      {/* 몸 */}
      {!peek && <ellipse cx="60" cy="86" rx="40" ry="16" className="frog-body" />}
      {!peek && <ellipse cx="60" cy="90" rx="22" ry="9" className="frog-belly" />}
      {/* 얼굴 */}
      <ellipse cx="60" cy="62" rx="46" ry="30" className="frog-body" />
      {/* 볼록 솟은 두 눈 */}
      <circle cx="36" cy="30" r="17" className="frog-body" />
      <circle cx="84" cy="30" r="17" className="frog-body" />
      <circle cx="36" cy="29" r="11" className="frog-eye" />
      <circle cx="84" cy="29" r="11" className="frog-eye" />
      <circle cx="38" cy="30" r="6" className="frog-pupil" />
      <circle cx="86" cy="30" r="6" className="frog-pupil" />
      <circle cx="40" cy="27" r="2" className="frog-eye" />
      <circle cx="88" cy="27" r="2" className="frog-eye" />
      {/* 분홍 볼 + 작은 웃음 */}
      <ellipse cx="30" cy="62" rx="8" ry="5" className="frog-cheek" />
      <ellipse cx="90" cy="62" rx="8" ry="5" className="frog-cheek" />
      <path d="M50 64 Q60 73 70 64" className="frog-smile" />
      {bow && <path d="M60 34 L48 26 L48 42 Z M60 34 L72 26 L72 42 Z" className="frog-bow" />}
      {bow && <circle cx="60" cy="34" r="4" className="frog-bow" />}
    </svg>
  )
}

/** 연잎 (개구리가 앉는 자리, 빈 화면 등) */
export function LilyPad({ size = 120, className }: { size?: number; className?: string }) {
  return (
    <svg className={['lilypad', className].filter(Boolean).join(' ')} width={size} height={size * 0.42} viewBox="0 0 120 50" aria-hidden="true" focusable="false">
      <path d="M60 25 L104 12 A48 22 0 1 1 72 4 Z" className="lilypad-leaf" />
      <path d="M60 25 L26 18 M60 25 L30 36 M60 25 L64 44 M60 25 L94 38" className="lilypad-vein" />
    </svg>
  )
}
