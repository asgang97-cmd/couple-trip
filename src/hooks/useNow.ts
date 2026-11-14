import { useEffect, useState } from 'react'

/**
 * 지금 시각. 앱을 백그라운드에서 다시 열 때마다 새로 읽는다.
 * (폰에서 켜 둔 채 다음 날 열어도 D-day·오늘 탭이 어제에 멈춰 있지 않게)
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'hidden') setNow(new Date())
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])
  return now
}
