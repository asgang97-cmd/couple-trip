import { useCallback, useEffect, useRef, useState } from 'react'
import type { Voucher } from '../lib/types'
import { browserFileCache, filesOf, readVoucherFile, syncVouchers, type FileCache } from '../lib/voucherCache'

interface Deps {
  download: (path: string) => Promise<Blob> // 보관함에서 파일 받기
  cache?: FileCache | null // 기본: 브라우저 Cache Storage
  persist?: () => void // 기본: 브라우저에 "오래 보관" 요청
}

const askPersist = () => {
  void globalThis.navigator?.storage?.persist?.().catch(() => {})
}

/**
 * 바우처 파일을 폰에 미리 받아 두고(온라인일 때), 어떤 바우처가 폰에 다 있는지 알려준다.
 * 오프라인이면 받지 않고 폰에 있는 것만 확인.
 */
export function useVoucherCache(vouchers: Voucher[], offline: boolean, deps: Deps) {
  const [cache] = useState<FileCache | null>(() => (deps.cache !== undefined ? deps.cache : browserFileCache()))
  const downloadRef = useRef(deps.download)
  const persistRef = useRef(deps.persist ?? askPersist)
  const asked = useRef(false)
  const [saved, setSaved] = useState<Set<string>>(() => new Set())

  // 파일 구성이 바뀔 때만 다시 (상대가 하트를 눌러 다시 불러와도 같은 목록이면 그대로)
  const signature = vouchers.map((v) => `${v.id}:${filesOf(v).join(',')}`).join('|')

  useEffect(() => {
    if (!cache) return
    let alive = true
    const list = vouchers
    if (offline) {
      void Promise.all(list.map(async (v) => ((await Promise.all(filesOf(v).map((p) => cache.has(p)))).every(Boolean) ? v.id : null)))
        .then((ids) => alive && setSaved(new Set(ids.filter((x): x is string => x !== null))))
        .catch(() => {})
    } else {
      if (list.length > 0 && !asked.current) {
        asked.current = true
        persistRef.current()
      }
      void syncVouchers(list, cache, downloadRef.current).then((r) => alive && setSaved(r.saved))
    }
    return () => {
      alive = false
    }
  }, [signature, offline, cache]) // eslint-disable-line react-hooks/exhaustive-deps -- signature가 vouchers를 대표함

  const isSaved = useCallback((id: string) => saved.has(id), [saved])
  const read = useCallback((path: string) => readVoucherFile(path, cache, downloadRef.current), [cache])

  return { isSaved, read, available: cache !== null }
}
