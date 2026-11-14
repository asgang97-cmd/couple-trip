import { describe, expect, test } from 'vitest'
import { clampOffset, coverScale, cropRect, initialView, MAX_ZOOM, pinch, zoomAt } from './crop'

const FRAME = { width: 400, height: 300 } // 4:3

describe('coverScale: 가장 작게 해도 틀이 꽉 차는 배율', () => {
  test('큰 가로 사진은 줄임 (높이에 맞춤)', () => expect(coverScale({ width: 4000, height: 2000 }, FRAME)).toBe(0.15))
  test('세로로 긴 사진은 가로에 맞춤', () => expect(coverScale({ width: 1000, height: 3000 }, FRAME)).toBe(0.4))
  test('틀보다 작은 사진은 키움', () => expect(coverScale({ width: 200, height: 150 }, FRAME)).toBe(2))
})

describe('initialView: 가운데, 꽉 차게', () => {
  test('가로 사진은 좌우 가운데', () => {
    const v = initialView({ width: 4000, height: 2000 }, FRAME) // 표시 크기 600×300
    expect(v).toEqual({ zoom: 1, x: -100, y: 0 })
  })
})

describe('clampOffset: 틀 밖으로 못 나감', () => {
  const img = { width: 4000, height: 2000 } // zoom 1 → 600×300
  test('오른쪽으로 너무 끌면 왼쪽 끝이 틀 왼쪽에 멈춤', () => {
    expect(clampOffset({ zoom: 1, x: 50, y: 0 }, img, FRAME)).toEqual({ zoom: 1, x: 0, y: 0 })
  })
  test('왼쪽으로 너무 끌면 오른쪽 끝이 틀 오른쪽에 멈춤', () => {
    expect(clampOffset({ zoom: 1, x: -500, y: 0 }, img, FRAME)).toEqual({ zoom: 1, x: -200, y: 0 })
  })
  test('위아래 여유가 없으면 0', () => {
    expect(clampOffset({ zoom: 1, x: -100, y: -40 }, img, FRAME).y).toBe(0)
  })
})

describe('zoomAt: 손가락 아래 지점을 그대로 두고 확대', () => {
  const img = { width: 400, height: 300 } // zoom 1 → 틀과 같은 크기
  test('가운데 기준 2배 → 가운데가 그대로', () => {
    expect(zoomAt({ zoom: 1, x: 0, y: 0 }, 2, { x: 200, y: 150 }, img, FRAME)).toEqual({ zoom: 2, x: -200, y: -150 })
  })
  test('1~4배를 넘지 않음', () => {
    expect(zoomAt({ zoom: 1, x: 0, y: 0 }, 10, { x: 0, y: 0 }, img, FRAME).zoom).toBe(MAX_ZOOM)
    expect(zoomAt({ zoom: 2, x: -200, y: -150 }, 0.2, { x: 0, y: 0 }, img, FRAME).zoom).toBe(1)
  })
  test('확대한 뒤 다시 줄여도 틀 밖으로 안 나감', () => {
    const v = zoomAt({ zoom: 4, x: -1200, y: -900 }, 1, { x: 0, y: 0 }, img, FRAME)
    expect(v).toEqual({ zoom: 1, x: 0, y: 0 })
  })
})

describe('cropRect: 원본 사진에서 잘라낼 영역', () => {
  test('가운데 맞춘 가로 사진', () => {
    // 표시 배율 0.15, 위치 -100 → 원본 x = 100 / 0.15 ≈ 666.67
    const r = cropRect({ zoom: 1, x: -100, y: 0 }, { width: 4000, height: 2000 }, FRAME)
    expect(r.sx).toBeCloseTo(666.67, 1)
    expect(r.sy).toBe(0)
    expect(r.sw).toBeCloseTo(2666.67, 1)
    expect(r.sh).toBe(2000)
  })
  test('작은 사진 2배 확대면 원본의 일부만', () => {
    const r = cropRect({ zoom: 2, x: -200, y: -150 }, { width: 200, height: 150 }, FRAME)
    expect(r).toEqual({ sx: 50, sy: 37.5, sw: 100, sh: 75 })
  })
})

describe('pinch: 두 손가락으로 확대와 이동을 함께', () => {
  const img = { width: 400, height: 300 }
  test('벌리면 두 손가락 가운데를 기준으로 확대', () => {
    const v = pinch({ zoom: 1, x: 0, y: 0 }, { x: 150, y: 150 }, { x: 250, y: 150 }, { x: 100, y: 150 }, { x: 250, y: 150 }, img, FRAME)
    // 거리 100 → 150 = 1.5배, 기준점은 처음 가운데(200,150), 그다음 가운데가 25px 왼쪽으로 이동
    expect(v.zoom).toBeCloseTo(1.5)
    expect(v.x).toBeCloseTo(200 - 200 * 1.5 - 25)
    expect(v.y).toBeCloseTo(150 - 150 * 1.5)
  })
  test('거리는 그대로, 두 손가락을 같이 움직이면 이동만', () => {
    const v = pinch({ zoom: 2, x: -200, y: -150 }, { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 130, y: 120 }, { x: 230, y: 120 }, img, FRAME)
    expect(v).toEqual({ zoom: 2, x: -170, y: -130 })
  })
})
