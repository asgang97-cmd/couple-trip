import { useEffect, useRef } from 'react'
import type { Decor, DecorSlot, DecorUrls } from '../lib/decor'

/**
 * 꾸미기 사진마다 볼 수 있는 주소를 받아 onChange로 알려줌.
 * decor가 undefined면(아직 불러오는 중) 아무것도 안 바꿈 — 빈 것으로 착각해 사진을 지우지 않게.
 */
export function useDecorUrls(
  decor: Decor | null | undefined,
  onChange: (urls: DecorUrls) => void,
  sign: (path: string) => Promise<string>,
) {
  const ref = useRef({ onChange, sign })
  useEffect(() => {
    ref.current = { onChange, sign }
  })
  const key = decor === undefined ? null : JSON.stringify(decor ?? {})

  useEffect(() => {
    if (key === null) return
    let alive = true
    const entries = Object.entries(JSON.parse(key) as Decor) as [DecorSlot, { path: string; round: boolean }][]
    void Promise.all(
      entries.map(async ([slot, item]) => {
        try {
          return [slot, { url: await ref.current.sign(item.path), round: item.round }] as const
        } catch {
          return null
        }
      }),
    ).then((pairs) => {
      if (!alive) return
      const urls: DecorUrls = {}
      for (const p of pairs) if (p) urls[p[0]] = p[1]
      ref.current.onChange(urls)
    })
    return () => {
      alive = false
    }
  }, [key])
}
