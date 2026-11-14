// 앱 캐릭터 고르기: theme.ts 의 mascot 값('manju' 또는 'frog')에 따라
import { theme } from '../theme'
import { Frog, LilyPad } from './Frog'
import { Manju, Plate } from './Manju'

type Kind = 'manju' | 'frog'

interface Props {
  size?: number
  pose?: 'sit' | 'peek'
  className?: string
  bow?: boolean
  kind?: Kind // 테스트용 (기본: theme.mascot)
}

export function Mascot({ kind = theme.mascot, ...p }: Props) {
  return kind === 'frog' ? <Frog {...p} /> : <Manju {...p} />
}

/** 캐릭터가 앉는 자리 (만쥬는 접시, 개구리는 연잎) */
export function Seat({ size, className, kind = theme.mascot }: { size?: number; className?: string; kind?: Kind }) {
  return kind === 'frog' ? <LilyPad size={size} className={className} /> : <Plate size={size} className={className} />
}
