// 캐릭터 자리: 밍석이 "꾸미기"에서 넣은 사진을 보여줌. 안 넣은 자리는 비워 둠.
import type { DecorSlot } from '../lib/decor'
import { useDecor } from './DecorContext'

interface Props {
  slot: Exclude<DecorSlot, 'background'>
  size?: number // 가로·세로 최대 크기(px)
  className?: string
}

export function Mascot({ slot, size = 96, className }: Props) {
  const item = useDecor()[slot]
  if (!item) return null
  return (
    <img
      className={['mascot', item.round ? 'round' : '', className].filter(Boolean).join(' ')}
      src={item.url}
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size }}
    />
  )
}
