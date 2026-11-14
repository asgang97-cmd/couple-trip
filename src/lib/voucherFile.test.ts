import { describe, expect, test } from 'vitest'
import { checkFile, kindOf, MAX_BYTES, titleOf } from './voucherFile'

const f = (name: string, type: string, size = 10) => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('voucherFile', () => {
  test('PDF / 사진 구분 (확장자만 있어도)', () => {
    expect(kindOf(f('ticket.pdf', 'application/pdf'))).toBe('pdf')
    expect(kindOf(f('TICKET.PDF', ''))).toBe('pdf')
    expect(kindOf(f('qr.png', 'image/png'))).toBe('image')
    expect(kindOf(f('IMG_1.HEIC', ''))).toBe('image')
    expect(kindOf(f('memo.txt', 'text/plain'))).toBeNull()
  })

  test('제목은 확장자 뺀 파일 이름', () => {
    expect(titleOf('KE703 e-ticket.pdf')).toBe('KE703 e-ticket')
    expect(titleOf('.pdf')).toBe('바우처')
  })

  test('10MB 넘거나 모르는 파일은 이유를 알려줌', () => {
    expect(checkFile(f('a.pdf', 'application/pdf', MAX_BYTES + 1))).toBe('10MB보다 큰 파일은 올릴 수 없어요')
    expect(checkFile(f('a.txt', 'text/plain'))).toBe('사진(JPG, PNG)이나 PDF만 올릴 수 있어요')
    expect(checkFile(f('a.jpg', 'image/jpeg'))).toBeNull()
  })
})
