// 바우처 파일을 폰에 미리 받아 두기 (비행기·해외 지하에서도 열리게)
import type { Voucher } from './types'

/** 파일 저장소 (진짜는 브라우저 Cache Storage, 테스트는 메모리) */
export interface FileCache {
  has(path: string): Promise<boolean>
  get(path: string): Promise<Blob | null>
  put(path: string, blob: Blob): Promise<void>
  keys(): Promise<string[]>
  delete(path: string): Promise<void>
}

const CACHE_NAME = 'vouchers-v1'
const PREFIX = '/__vouchers/'
const urlOf = (path: string) => PREFIX + encodeURIComponent(path)

/** 브라우저 Cache Storage. 없는 환경(아주 오래된 브라우저)이면 null */
export function browserFileCache(): FileCache | null {
  if (typeof caches === 'undefined') return null
  const open = () => caches.open(CACHE_NAME)
  return {
    has: async (p) => (await (await open()).match(urlOf(p))) !== undefined,
    get: async (p) => {
      const res = await (await open()).match(urlOf(p))
      return res ? res.blob() : null
    },
    put: async (p, b) => {
      await (await open()).put(urlOf(p), new Response(b, { headers: { 'Content-Type': b.type || 'application/octet-stream' } }))
    },
    keys: async () =>
      (await (await open()).keys())
        .map((r) => new URL(r.url).pathname)
        .filter((u) => u.startsWith(PREFIX))
        .map((u) => decodeURIComponent(u.slice(PREFIX.length))),
    delete: async (p) => {
      await (await open()).delete(urlOf(p))
    },
  }
}

/** 테스트용 */
export function memoryFileCache(init: Record<string, Blob> = {}): FileCache {
  const m = new Map(Object.entries(init))
  return {
    has: async (p) => m.has(p),
    get: async (p) => m.get(p) ?? null,
    put: async (p, b) => void m.set(p, b),
    keys: async () => [...m.keys()],
    delete: async (p) => void m.delete(p),
  }
}

/** 바우처 하나에 필요한 파일들 (원본 + 페이지 그림) */
export const filesOf = (v: Pick<Voucher, 'path' | 'pages'>) => [v.path, ...v.pages]

/**
 * 모든 바우처 파일을 폰에 받아 두고, 지워진 바우처의 파일은 정리.
 * 하나가 실패해도 멈추지 않는다. saved = 파일을 전부 가진 바우처 id
 */
export async function syncVouchers(
  vouchers: Voucher[],
  cache: FileCache,
  download: (path: string) => Promise<Blob>,
): Promise<{ saved: Set<string>; failed: number }> {
  const saved = new Set<string>()
  let failed = 0
  for (const v of vouchers) {
    let ok = true
    for (const path of filesOf(v)) {
      try {
        if (!(await cache.has(path))) await cache.put(path, await download(path))
      } catch {
        ok = false
      }
    }
    if (ok) saved.add(v.id)
    else failed++
  }
  try {
    const keep = new Set(vouchers.flatMap(filesOf))
    for (const k of await cache.keys()) if (!keep.has(k)) await cache.delete(k)
  } catch {
    // 정리는 다음에
  }
  return { saved, failed }
}

/** 파일 열기: 폰 저장본 먼저, 없으면 받아서 저장해 두고 */
export async function readVoucherFile(path: string, cache: FileCache | null, download: (path: string) => Promise<Blob>): Promise<Blob> {
  const hit = await cache?.get(path).catch(() => null)
  if (hit) return hit
  const blob = await download(path)
  await cache?.put(path, blob).catch(() => {})
  return blob
}
