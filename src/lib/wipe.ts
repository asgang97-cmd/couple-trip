// 진짜 로그아웃(비밀번호 변경 등으로 로그인이 끊김) 때 폰에 남은 민감한 저장본 지우기.
// 폰을 잃어버려 비밀번호를 바꿨을 때, 화면만 잠기고 자료는 남아 있지 않게.
//
// 남기는 것 (일부러):
// - vjw:v1 비짓재팬 정보: 이 폰에만 있는 자료라 지우면 다시 못 살림 (사용자 결정 2026-11-20)
// - member: 누구인지 (민감하지 않음)
// - expense-queue:v1 등: 아직 못 올린 가계부. 다시 로그인하면 올라가야 함

const STORAGE_KEYS = [
  'snapshot:v1', // 일정·댓글·바우처 목록·가계부 저장본 (offlineCache.ts)
  'signed-urls:v1', // 사진 주소 (repo.ts)
  'decor-urls:v1', // 꾸미기 사진 주소 (decor.ts)
]
const CACHE_NAMES = [
  'vouchers-v1', // 바우처 파일 원본 (voucherCache.ts)
  'cover-photo', // 커플·꾸미기 사진 파일 (vite.config.ts 서비스워커)
]

interface CacheDeleter {
  delete(name: string): Promise<boolean>
}

export async function wipeOnSignOut({
  storage = globalThis.localStorage,
  caches = typeof globalThis.caches === 'undefined' ? null : globalThis.caches,
}: { storage?: Storage; caches?: CacheDeleter | null } = {}): Promise<void> {
  for (const key of STORAGE_KEYS) {
    try {
      storage.removeItem(key)
    } catch {
      // 저장소가 막힌 브라우저면 지울 것도 없음
    }
  }
  if (!caches) return
  await Promise.all(CACHE_NAMES.map((name) => caches.delete(name).catch(() => false)))
}
