// 우리 밤만쥬 🌰 (새로 그린 오리지널 캐릭터: 동글 만쥬 + 머리 위 밤잎 새싹). 색은 tokens.css의 --color-bun-* 를 따라감.

interface Props {
  /** 가로 크기(px) */
  size?: number
  /** 'sit' 전체 · 'peek' 위쪽만 빼꼼 (커버 아래 끝용) */
  pose?: 'sit' | 'peek'
  className?: string
  /** 머리 위 분홍 리본 (커플 중 한 명) */
  bow?: boolean
}

export function Manju({ size = 96, pose = 'sit', className, bow = false }: Props) {
  const peek = pose === 'peek'
  return (
    <svg
      className={['manju', className].filter(Boolean).join(' ')}
      width={size}
      height={size * (peek ? 0.67 : 0.9)}
      viewBox={peek ? '0 0 120 80' : '0 0 120 108'}
      aria-hidden="true"
      focusable="false"
    >
      {/* 새싹 잎 두 장 */}
      <path d="M60 22 C52 10 40 10 36 14 C42 20 52 22 60 22 Z" className="manju-leaf" />
      <path d="M60 22 C66 8 78 6 84 10 C78 18 68 22 60 22 Z" className="manju-leaf" />
      <path d="M60 22 L60 28" className="manju-stem" />
      {/* 몸: 아래가 넓은 동글 만쥬 */}
      <path d="M14 82 C10 50 32 26 60 26 C88 26 110 50 106 82 C104 98 84 104 60 104 C36 104 16 98 14 82 Z" className="manju-body" />
      {/* 노릇하게 구운 윗면 */}
      <path d="M22 58 C26 38 42 28 60 28 C78 28 94 38 98 58 C86 52 74 50 60 50 C46 50 34 52 22 58 Z" className="manju-top" />
      <ellipse cx="44" cy="38" rx="9" ry="4" className="manju-shine" />
      {/* 깨 */}
      <ellipse cx="54" cy="36" rx="1.6" ry="1" className="manju-seed" />
      <ellipse cx="66" cy="34" rx="1.6" ry="1" className="manju-seed" />
      <ellipse cx="74" cy="40" rx="1.6" ry="1" className="manju-seed" />
      {/* 반짝이는 눈 */}
      <ellipse cx="44" cy="68" rx="5" ry="6" className="manju-eye" />
      <ellipse cx="76" cy="68" rx="5" ry="6" className="manju-eye" />
      <circle cx="45.5" cy="66" r="1.8" className="manju-glint" />
      <circle cx="77.5" cy="66" r="1.8" className="manju-glint" />
      {/* 분홍 볼 + 작은 입 */}
      <ellipse cx="32" cy="78" rx="7" ry="4.5" className="manju-cheek" />
      <ellipse cx="88" cy="78" rx="7" ry="4.5" className="manju-cheek" />
      <path d="M55 77 Q60 82 65 77" className="manju-mouth" />
      {bow && <path d="M88 34 L78 27 L78 41 Z M88 34 L98 27 L98 41 Z" className="manju-bow" />}
      {bow && <circle cx="88" cy="34" r="3.5" className="manju-bow" />}
    </svg>
  )
}

/** 만쥬가 앉는 접시 */
export function Plate({ size = 120, className }: { size?: number; className?: string }) {
  return (
    <svg className={['plate', className].filter(Boolean).join(' ')} width={size} height={size * 0.25} viewBox="0 0 120 30" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="15" rx="58" ry="13" className="plate-rim" />
      <ellipse cx="60" cy="13" rx="42" ry="8" className="plate-well" />
    </svg>
  )
}
