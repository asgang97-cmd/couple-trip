// 커버 사진 자르기 계산 (화면 없이 숫자만)
// View: zoom = 꽉 차는 크기 대비 배율(1~MAX_ZOOM), x·y = 사진 왼쪽 위가 틀 왼쪽 위에서 떨어진 위치(px, 0 이하)

export interface Size { width: number; height: number }
export interface View { zoom: number; x: number; y: number }

export const MAX_ZOOM = 4
export const CROP_ASPECT = 4 / 3
export const OUTPUT = { width: 1200, height: 900 }

/** 가장 작게 해도 틀이 사진으로 꽉 차는 배율 */
export function coverScale(img: Size, frame: Size): number {
  return Math.max(frame.width / img.width, frame.height / img.height)
}

const shown = (v: View, img: Size, frame: Size) => {
  const s = coverScale(img, frame) * v.zoom
  return { s, w: img.width * s, h: img.height * s }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** 사진 가장자리가 틀 안으로 들어오지 않게 위치를 묶음 */
export function clampOffset(v: View, img: Size, frame: Size): View {
  const { w, h } = shown(v, img, frame)
  return { zoom: v.zoom, x: clamp(v.x, frame.width - w, 0) || 0, y: clamp(v.y, frame.height - h, 0) || 0 }
}

/** 처음: 꽉 차게, 가운데 */
export function initialView(img: Size, frame: Size): View {
  const { w, h } = shown({ zoom: 1, x: 0, y: 0 }, img, frame)
  return { zoom: 1, x: (frame.width - w) / 2 || 0, y: (frame.height - h) / 2 || 0 }
}

/** focus(틀 기준 px) 아래의 지점을 그대로 두고 zoom 배율로 */
export function zoomAt(v: View, zoom: number, focus: { x: number; y: number }, img: Size, frame: Size): View {
  const z = clamp(zoom, 1, MAX_ZOOM)
  const k = z / v.zoom
  return clampOffset({ zoom: z, x: focus.x - (focus.x - v.x) * k, y: focus.y - (focus.y - v.y) * k }, img, frame)
}

/** 원본 사진에서 잘라낼 영역 (원본 px) */
export function cropRect(v: View, img: Size, frame: Size): { sx: number; sy: number; sw: number; sh: number } {
  const { s } = shown(v, img, frame)
  return { sx: -v.x / s || 0, sy: -v.y / s || 0, sw: frame.width / s, sh: frame.height / s }
}

type Pt = { x: number; y: number }

/**
 * 두 손가락: 처음 두 점(a0, b0) → 지금 두 점(a1, b1).
 * 처음 가운데를 기준으로 거리 비율만큼 확대한 뒤, 가운데가 움직인 만큼 옮긴다.
 */
export function pinch(v: View, a0: Pt, b0: Pt, a1: Pt, b1: Pt, img: Size, frame: Size): View {
  const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y)
  const d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y)
  const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }
  const m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }
  const z = Math.min(MAX_ZOOM, Math.max(1, d0 > 0 ? v.zoom * (d1 / d0) : v.zoom))
  const k = z / v.zoom
  const zoomed = { zoom: z, x: m0.x - (m0.x - v.x) * k, y: m0.y - (m0.y - v.y) * k }
  return clampOffset({ zoom: z, x: zoomed.x + m1.x - m0.x, y: zoomed.y + m1.y - m0.y }, img, frame)
}
