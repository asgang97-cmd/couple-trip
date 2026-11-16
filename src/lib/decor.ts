// 꾸미기: 밍석이 직접 넣는 캐릭터 사진 5자리 + 앱 배경 사진
export type DecorSlot = 'coverA' | 'coverB' | 'day' | 'gate' | 'empty' | 'background'
export interface DecorItem { path: string; round: boolean } // round = 배경 있는 사진이라 동그랗게 잘라 보여줌
export type Decor = Partial<Record<DecorSlot, DecorItem>>
export type DecorUrls = Partial<Record<DecorSlot, { url: string; round: boolean }>>

export const DECOR_SLOTS: { slot: DecorSlot; label: string }[] = [
  { slot: 'coverA', label: '커버 캐릭터 1' },
  { slot: 'coverB', label: '커버 캐릭터 2' },
  { slot: 'day', label: '고른 날짜 위 캐릭터' },
  { slot: 'gate', label: '비밀번호 화면 캐릭터' },
  { slot: 'empty', label: '빈 화면 캐릭터' },
  { slot: 'background', label: '앱 배경 사진' },
]

/** RGBA 픽셀 중 투명한 게 하나라도 있나 */
export function hasTransparency(rgba: Uint8ClampedArray): boolean {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 250) return true
  return false
}

const URLS_KEY = 'decor-urls:v1'
const BG_FILL = '#faf5ee' // 앱 바탕 크림색(--color-paper)과 비슷하게

/** 마지막으로 받은 사진 주소 (로그인 전 비밀번호 화면·오프라인에서도 보이게) */
export function loadDecorUrls(storage: Storage = globalThis.localStorage): DecorUrls {
  try {
    const v = JSON.parse(storage.getItem(URLS_KEY) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

export function saveDecorUrls(urls: DecorUrls, storage: Storage = globalThis.localStorage): void {
  try {
    storage.setItem(URLS_KEY, JSON.stringify(urls))
  } catch {
    // 못 저장해도 이번엔 보임
  }
}

/** 올릴 사진 준비: 캐릭터는 긴 변 600px(투명이면 PNG 그대로, 아니면 JPEG + 동그랗게), 배경은 1600px JPEG */
export async function prepareDecor(file: File, slot: DecorSlot): Promise<{ blob: Blob; round: boolean }> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const max = slot === 'background' ? 1600 : 600
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')!
    if (slot === 'background') {
      // 배경은 늘 JPEG라 투명한 부분이 까맣게 됨 → 크림색 바탕을 먼저 깔기
      ctx.fillStyle = BG_FILL
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const transparent = slot !== 'background' && hasTransparency(ctx.getImageData(0, 0, canvas.width, canvas.height).data)
    const type = transparent ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => {
        canvas.width = 0
        canvas.height = 0
        if (b) resolve(b)
        else reject(new Error('사진 변환 실패'))
      }, type, 0.88),
    )
    return { blob, round: slot !== 'background' && !transparent }
  } finally {
    URL.revokeObjectURL(url)
  }
}
