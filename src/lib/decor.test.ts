import { describe, expect, test } from 'vitest'
import { memoryStorage } from '../test-utils'
import { DECOR_SLOTS, hasTransparency, loadDecorUrls, saveDecorUrls } from './decor'

describe('decor', () => {
  test('자리 6곳 (캐릭터 5 + 배경)', () => {
    expect(DECOR_SLOTS.map((s) => s.slot)).toEqual(['coverA', 'coverB', 'day', 'gate', 'empty', 'background'])
  })

  test('투명한 부분이 있는지 (투명 PNG는 그대로, 아니면 동그랗게)', () => {
    const opaque = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255])
    const clear = new Uint8ClampedArray([1, 2, 3, 255, 0, 0, 0, 0])
    expect(hasTransparency(opaque)).toBe(false)
    expect(hasTransparency(clear)).toBe(true)
  })

  test('사진 주소를 폰에 기억 (로그인 전 비밀번호 화면·오프라인에서도 보이게)', () => {
    const s = memoryStorage()
    saveDecorUrls({ gate: { url: 'https://s/g', round: false } }, s)
    expect(loadDecorUrls(s)).toEqual({ gate: { url: 'https://s/g', round: false } })
    expect(loadDecorUrls(memoryStorage({ 'decor-urls:v1': '{bad' }))).toEqual({})
  })
})
