// 앱 아이콘 만들기: 테마 분홍 배경 + 흰 하트 (외부 도구 없이 Node만으로 PNG 생성)
// 실행: node scripts/make-icons.mjs
// 직접 만든 아이콘을 쓰고 싶으면 public/icon-192.png, icon-512.png, apple-touch-icon.png(180x180)를 같은 이름으로 바꿔 넣으면 됨
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [0xff, 0x6b, 0x81]
const FG = [0xff, 0xff, 0xff]

// 하트 곡선 (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0 , 아이콘 가운데 약 55% 크기
function inHeart(px, py, size) {
  const x = ((px + 0.5) / size - 0.5) * 4.2
  const y = -((py + 0.5) / size - 0.53) * 4.2
  const a = x * x + y * y - 1
  return a * a * a - x * x * y * y * y <= 0
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  const SS = 4 // 가장자리를 부드럽게: 픽셀당 4x4 샘플
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // 필터 없음
    for (let x = 0; x < size; x++) {
      let hit = 0
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) if (inHeart(x + (sx + 0.5) / SS - 0.5, y + (sy + 0.5) / SS - 0.5, size)) hit++
      const t = hit / (SS * SS)
      const o = y * (size * 3 + 1) + 1 + x * 3
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(BG[i] * (1 - t) + FG[i] * t)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // 8비트
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = new URL('../public/', import.meta.url)
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(new URL(name, out), png(size))
}
console.log('icons written')
