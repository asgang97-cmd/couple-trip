import { useCallback, useEffect, useRef, useState } from 'react'
import type { Voucher } from '../lib/types'
import { browserFileCache, filesOf, readVoucherFile, syncVouchers, type FileCache } from '../lib/voucherCache'

interface Deps {
  download: (path: string) => Promise<Blob> // 보관함에서 파일 받기
  cache?: FileCache | null // 기본: 브라우저 Cache Storage
  persist?: () => void // 기본: 브라우저에 "오래 보관" 요청
  /** 목록이 방금 제대로 불러온 것일 때만 true (예전 목록이면 폰의 파일을 정리하지 않음) */
  prune?: boolean
}

const askPersist = () => {
  void globalThis.navigator?.storage?.persist?.().catch(() => {})
}

/**
 * 바우처 파일을 폰에 미리 받아 두고(온라인일 때), 어떤 바우처가 폰에 다 있는지 알려준다.
 * vouchers가 null이면(아직 불러오는 중) 아무것도 하지 않는다 — 빈 목록으로 착각해 지우지 않게.
 * 오프라인이면 받지 않고 폰에 있는 것만 확인. 받기는 한 번에 하나씩(겹쳐서 서로 지우지 않게).
 */
export function useVoucherCache(vouchers: Voucher[] | null, offline: boolean, deps: Deps) {
  const [cache] = useState<FileCache | null>(() => (deps.cache !== undefined ? deps.cache : browserFileCache()))
  const downloadRef = useRef(deps.download)
  const persistRef = useRef(deps.persist ?? askPersist)
  const asked = useRef(false)
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const [saved, setSaved] = useState<Set<string>>(() => new Set())
  const prune = deps.prune ?? true

  // 파일 구성이 바뀔 때만 다시 (상대가 하트를 눌러 다시 불러와도 같은 목록이면 그대로)
  const signature = vouchers === null ? null : vouchers.map((v) => `${v.id}:${filesOf(v).join(',')}`).join('|')

  useEffect(() => {
    if (!cache || vouchers === null) return
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
      // 앞의 받기가 끝난 뒤에 시작, 그 사이 목록이 바뀌었으면(alive=false) 정리는 건너뜀
      chain.current = chain.current
        .then(() => syncVouchers(list, cache, downloadRef.current, { prune: () => alive && prune }))
        .then((r) => alive && setSaved(r.saved))
        .catch(() => {})
    }
    return () => {
      alive = false
    }
  }, [signature, offline, cache, prune]) // eslint-disable-line react-hooks/exhaustive-deps -- signature가 vouchers를 대표함

  const isSaved = useCallback((id: string) => saved.has(id), [saved])
  const read = useCallback((path: string) => readVoucherFile(path, cache, downloadRef.current), [cache])

  return { isSaved, read }
}
